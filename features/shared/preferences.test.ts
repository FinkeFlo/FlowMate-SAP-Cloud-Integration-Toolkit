import { describe, expect, it, vi } from 'vitest';

vi.mock('wxt/browser', () => ({ browser: { storage: { sync: { get: vi.fn(), set: vi.fn() }, onChanged: { addListener: vi.fn(), removeListener: vi.fn() } } } }));

import { DEFAULT_PREFERENCES, normalizeRefreshSec, sanitizePreferences } from './preferences';

describe('normalizeRefreshSec', () => {
  it('keeps values inside the allowed range and rounds', () => {
    expect(normalizeRefreshSec(10)).toBe(10);
    expect(normalizeRefreshSec(12.4)).toBe(12);
    expect(normalizeRefreshSec('30')).toBe(30);
  });

  it('clamps to the min/max', () => {
    expect(normalizeRefreshSec(1)).toBe(5);
    expect(normalizeRefreshSec(0)).toBe(5);
    expect(normalizeRefreshSec(10_000)).toBe(300);
  });

  it('falls back to the default for garbage', () => {
    expect(normalizeRefreshSec(undefined)).toBe(DEFAULT_PREFERENCES.messageLogRefreshSec);
    expect(normalizeRefreshSec(NaN)).toBe(DEFAULT_PREFERENCES.messageLogRefreshSec);
    expect(normalizeRefreshSec('abc')).toBe(DEFAULT_PREFERENCES.messageLogRefreshSec);
    expect(normalizeRefreshSec(null)).toBe(DEFAULT_PREFERENCES.messageLogRefreshSec);
  });
});

describe('sanitizePreferences', () => {
  it('merges with defaults and ignores unknown or invalid fields', () => {
    expect(sanitizePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences({ messageLogRefreshSec: 60, foo: 1 })).toEqual({ messageLogRefreshSec: 60 });
    expect(sanitizePreferences('nope')).toEqual(DEFAULT_PREFERENCES);
  });
});
