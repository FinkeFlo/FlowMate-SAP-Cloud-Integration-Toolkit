/**
 * User preferences — small, user-facing settings that are not tenant data.
 * Stored in `browser.storage.sync` under {@link PREFERENCES_KEY} so they follow
 * the user's browser profile. Tenant/customer configuration stays in
 * `features/settings/settings.ts` (`storage.local`).
 */
import { browser } from 'wxt/browser';

export const PREFERENCES_KEY = 'flowmate.preferences';

export interface Preferences {
  /** Auto-refresh interval of the message log panel, in seconds. */
  messageLogRefreshSec: number;
}

export const MESSAGE_LOG_REFRESH_MIN_SEC = 5;
export const MESSAGE_LOG_REFRESH_MAX_SEC = 300;
export const MESSAGE_LOG_REFRESH_PRESETS_SEC = [5, 10, 15, 30, 60] as const;

export const DEFAULT_PREFERENCES: Preferences = {
  messageLogRefreshSec: 10,
};

/** Clamps/normalises a stored or user-entered interval; falls back to the default for garbage. */
export function normalizeRefreshSec(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return DEFAULT_PREFERENCES.messageLogRefreshSec;
  return Math.min(MESSAGE_LOG_REFRESH_MAX_SEC, Math.max(MESSAGE_LOG_REFRESH_MIN_SEC, Math.round(n)));
}

/** Merges a raw stored object with defaults and normalises every field (storage is a trust boundary). */
export function sanitizePreferences(raw: unknown): Preferences {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Preferences, unknown>>;
  return {
    messageLogRefreshSec: normalizeRefreshSec(obj.messageLogRefreshSec),
  };
}

export async function getPreferences(): Promise<Preferences> {
  try {
    const result = await browser.storage.sync.get(PREFERENCES_KEY);
    return sanitizePreferences(result[PREFERENCES_KEY]);
  } catch {
    // storage.sync may be unavailable (e.g. non-extension context)
    return { ...DEFAULT_PREFERENCES };
  }
}

export async function savePreferences(update: Partial<Preferences>): Promise<Preferences> {
  const current = await getPreferences();
  const next = sanitizePreferences({ ...current, ...update });
  await browser.storage.sync.set({ [PREFERENCES_KEY]: next });
  return next;
}

/** Subscribes to preference changes from any extension context; returns an unsubscribe function. */
export function onPreferencesChange(listener: (prefs: Preferences) => void): () => void {
  const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'sync' && changes[PREFERENCES_KEY]) {
      listener(sanitizePreferences(changes[PREFERENCES_KEY].newValue));
    }
  };
  try {
    browser.storage.onChanged.addListener(handler);
    return () => browser.storage.onChanged.removeListener(handler);
  } catch {
    return () => {};
  }
}
