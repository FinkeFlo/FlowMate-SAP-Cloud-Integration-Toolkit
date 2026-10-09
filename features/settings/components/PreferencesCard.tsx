import { useEffect, useState } from 'preact/hooks';
import { t } from '@/features/shared/i18n';
import { showToast } from '@/features/shared/toast';
import {
  getPreferences,
  savePreferences,
  normalizeRefreshSec,
  MESSAGE_LOG_REFRESH_PRESETS_SEC,
  DEFAULT_PREFERENCES,
} from '@/features/shared/preferences';

/** Options page card for user preferences that are not tenant data. */
export function PreferencesCard() {
  const [refreshSec, setRefreshSec] = useState<number>(DEFAULT_PREFERENCES.messageLogRefreshSec);

  useEffect(() => {
    let active = true;
    getPreferences().then(p => { if (active) setRefreshSec(p.messageLogRefreshSec); });
    return () => { active = false; };
  }, []);

  async function handleRefreshChange(e: Event) {
    const value = normalizeRefreshSec((e.currentTarget as HTMLSelectElement).value);
    setRefreshSec(value);
    try {
      await savePreferences({ messageLogRefreshSec: value });
      showToast(t('prefsSaved'), 'success');
    } catch (error) {
      showToast(`${t('errorSaving')}: ${String(error)}`, 'error');
    }
  }

  return (
    <div class="card card-border mb-6 border-base-300 bg-base-100 p-6">
      <div class="mb-4">
        <h2 class="text-lg font-bold tracking-tight">{t('prefsTitle')}</h2>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <label class="text-sm font-semibold" for="prefs-message-log-refresh">{t('prefsMessageLogRefresh')}</label>
        <select
          id="prefs-message-log-refresh"
          class="select select-bordered select-sm w-28"
          value={refreshSec}
          onChange={handleRefreshChange}
        >
          {MESSAGE_LOG_REFRESH_PRESETS_SEC.map(v => (
            <option key={v} value={v}>{v} s</option>
          ))}
        </select>
        <span class="text-xs text-muted">{t('prefsMessageLogRefreshHint')}</span>
      </div>
    </div>
  );
}
