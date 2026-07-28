import { useState, useEffect, useRef } from 'preact/hooks';
import { browser } from 'wxt/browser';
import { LoaderCircle, RefreshCw, TriangleAlert, Zap, Check } from 'lucide-preact';
import { devLog } from '@/features/shared/dev-logger';
import { showToast } from '@/features/shared/toast';
import { t, tSub } from '@/features/shared/i18n';
import { setMplLogLevel, fetchLogLevels, type MplLogLevel } from '@/features/shared/log-level-api';
import { fetchTopLoggers, type UsageEntry } from './usage-api';

const LOG_TAG = 'LogThrottle';

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const THRESHOLD_STORAGE_KEY = 'logThrottle.threshold';
const DEFAULT_THRESHOLD = 10_000;

async function loadThreshold(): Promise<number> {
  try {
    const result = await browser.storage.sync.get(THRESHOLD_STORAGE_KEY);
    const stored = result[THRESHOLD_STORAGE_KEY];
    if (typeof stored === 'number' && stored > 0) return stored;
  } catch {
    // browser.storage may be unavailable in non-extension contexts
  }
  return DEFAULT_THRESHOLD;
}

function saveThreshold(value: number): void {
  try {
    browser.storage.sync.set({ [THRESHOLD_STORAGE_KEY]: value });
  } catch {
    // best effort
  }
}

export function LogThrottlePanel() {
  const [rows, setRows] = useState<UsageEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);
  const [throttledSet, setThrottledSet] = useState<Set<string>>(new Set());
  const [throttlingNow, setThrottlingNow] = useState<string | null>(null);
  const [levels, setLevels] = useState<Map<string, MplLogLevel | null> | null>(null);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  useEffect(() => {
    loadThreshold().then(value => {
      if (mountedRef.current) setThreshold(value);
    });
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTopLoggers();
      if (mountedRef.current) {
        setRows(data);
        devLog.info(LOG_TAG, `Loaded ${data.length} iFlows`);
        fetchLevelsForRows(data.map(r => r.symbolicName));
      }
    } catch (err) {
      const msg = String(err);
      devLog.error(LOG_TAG, 'Failed to load top loggers', { error: msg });
      if (mountedRef.current) setError(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  function handleThresholdChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const next = parseInt(input.value, 10);
    if (!Number.isFinite(next) || next < 0) return;
    setThreshold(next);
    saveThreshold(next);
  }

  async function handleThrottle(symbolicName: string) {
    if (throttlingNow) return;
    const confirmed = window.confirm(
      `Set log level of "${symbolicName}" to ERROR?\n\n` +
      `New INFO/DEBUG logs will be suppressed until you manually restore the level.`,
    );
    if (!confirmed) return;

    setThrottlingNow(symbolicName);
    try {
      await setMplLogLevel(symbolicName, 'ERROR');
      if (mountedRef.current) {
        setThrottledSet(prev => {
          const next = new Set(prev);
          next.add(symbolicName);
          return next;
        });
        showToast(`Silenced "${symbolicName}" (log level: ERROR)`, 'success');
        devLog.info(LOG_TAG, 'Throttled iFlow', { symbolicName });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      devLog.error(LOG_TAG, 'Failed to throttle iFlow', { symbolicName, error: message });
      showToast(`Failed to silence "${symbolicName}": ${message}`, 'error');
    } finally {
      if (mountedRef.current) setThrottlingNow(null);
    }
  }

  function toggleSelected(symbolicName: string) {
    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(symbolicName)) next.delete(symbolicName);
      else next.add(symbolicName);
      return next;
    });
  }

  function selectAllHot() {
    if (!rows) return;
    const hot = rows
      .filter(r => r.count >= threshold && !isAlreadyThrottled(r.symbolicName))
      .map(r => r.symbolicName);
    setSelectedSet(new Set(hot));
  }

  async function handleBulkSilence() {
    if (selectedSet.size === 0 || bulkRunning) return;
    const list = Array.from(selectedSet);
    const preview = list.slice(0, 5).map(n => `• ${n}`).join('\n');
    const rest = list.length > 5 ? `\n• … and ${list.length - 5} more` : '';
    const confirmed = window.confirm(
      `Set log level of ${list.length} iFlow${list.length > 1 ? 's' : ''} to ERROR?\n\n` +
      preview + rest,
    );
    if (!confirmed) return;

    setBulkRunning(true);
    const newlyThrottled = new Set<string>();
    let failures = 0;

    for (const name of list) {
      try {
        await setMplLogLevel(name, 'ERROR');
        newlyThrottled.add(name);
      } catch (err) {
        failures++;
        const message = err instanceof Error ? err.message : String(err);
        devLog.error(LOG_TAG, 'Bulk silence failed', { symbolicName: name, error: message });
      }
    }

    if (mountedRef.current) {
      setThrottledSet(prev => new Set([...prev, ...newlyThrottled]));
      setSelectedSet(new Set());
      setBulkRunning(false);
      if (failures === 0) {
        showToast(`Silenced ${newlyThrottled.size} iFlow${newlyThrottled.size > 1 ? 's' : ''}`, 'success');
      } else if (newlyThrottled.size === 0) {
        showToast(`Failed to silence ${failures} iFlow${failures > 1 ? 's' : ''}`, 'error');
      } else {
        showToast(`Silenced ${newlyThrottled.size}, ${failures} failed`, 'warning');
      }
      devLog.info(LOG_TAG, 'Bulk silence done', { silenced: newlyThrottled.size, failures });
    }
  }

  async function fetchLevelsForRows(names: string[]) {
    if (names.length === 0) return;
    setLevelsLoading(true);
    try {
      const map = await fetchLogLevels(names);
      if (mountedRef.current) setLevels(map);
    } catch (err) {
      devLog.warn(LOG_TAG, 'Failed to fetch log levels', { error: String(err) });
    } finally {
      if (mountedRef.current) setLevelsLoading(false);
    }
  }

  function isAlreadyThrottled(symbolicName: string): boolean {
    if (throttledSet.has(symbolicName)) return true;
    return levels?.get(symbolicName) === 'ERROR';
  }

  return (
    <div class="flex min-w-[360px] max-w-[420px] max-h-[480px] flex-col gap-2 text-[13px] text-base-content" onPointerDown={(e) => e.stopPropagation()}>
      <header class="flex items-center gap-2 border-b border-base-300 pb-2">
        <span class="font-semibold tracking-wide">{t('logThrottleTopLoggers')}</span>
        {levelsLoading && (
          <span class="ml-auto animate-spin text-base-content/50" title="Checking current log levels">
            <LoaderCircle size={12} />
          </span>
        )}
        <button
          class="btn btn-ghost btn-xs btn-square"
          onClick={load}
          disabled={loading}
          title="Refresh"
        >
          {loading ? (
            <span class="animate-spin"><LoaderCircle size={14} /></span>
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      </header>

      <div class="flex items-center gap-2 pb-1 text-xs text-base-content/80">
        <label class="whitespace-nowrap">{t('logThrottleHighlightAbove')}</label>
        <input
          type="number"
          min={0}
          step={100}
          class="input input-bordered input-xs h-8 w-24 font-mono"
          value={threshold}
          onInput={handleThresholdChange}
        />
        <span class="text-base-content/60">{t('logThrottlePerDay')}</span>
      </div>

      {rows && rows.some(r => r.count >= threshold && !isAlreadyThrottled(r.symbolicName)) && (
        <button
          class="btn btn-link btn-xs h-auto min-h-0 self-start px-0 no-underline hover:no-underline"
          onClick={selectAllHot}
          disabled={bulkRunning}
          type="button"
        >
          {t('logThrottleSelectAllAbove')}
        </button>
      )}

      {selectedSet.size > 0 && (
        <div class="flex items-center gap-2 rounded-field bg-primary/10 px-3 py-2">
          <span class="flex-1 text-xs font-semibold text-primary">{tSub('logThrottleSelected', String(selectedSet.size))}</span>
          <button
            class="btn btn-primary btn-xs gap-1"
            onClick={handleBulkSilence}
            disabled={bulkRunning}
            type="button"
          >
            {bulkRunning ? (
              <span class="animate-spin"><LoaderCircle size={14} /></span>
            ) : (
              <Zap size={14} />
            )}
            <span>{t('logThrottleSilenceSelected')}</span>
          </button>
          <button
            class="btn btn-ghost btn-xs"
            onClick={() => setSelectedSet(new Set())}
            disabled={bulkRunning}
            type="button"
          >
            {t('logThrottleClear')}
          </button>
        </div>
      )}

      {error && (
        <div class="alert alert-error py-2 text-xs">
          <TriangleAlert size={14} />
          <span>{error}</span>
        </div>
      )}

      {!error && rows && rows.length === 0 && (
        <div class="py-4 text-center italic text-base-content/60">{t('logThrottleNoActivity')}</div>
      )}

      {!error && rows && rows.length > 0 && (
        <ul class="overflow-y-auto rounded-box border border-base-300/70 bg-base-100/60">
          {rows.map(row => {
            const throttled = isAlreadyThrottled(row.symbolicName);
            const isHot = row.count >= threshold;
            const isBusy = bulkRunning || throttlingNow === row.symbolicName;

            return (
              <li
                class={`group flex items-center gap-2 border-b border-base-300/40 px-2 py-1.5 last:border-b-0 hover:bg-base-200/70 ${isHot ? 'bg-error/10 shadow-[inset_3px_0_0_0_var(--color-error)]' : ''}`}
                key={row.symbolicName}
              >
                {throttled ? (
                  <span class="w-4 shrink-0" />
                ) : (
                  <input
                    type="checkbox"
                    class="checkbox checkbox-xs shrink-0"
                    checked={selectedSet.has(row.symbolicName)}
                    onChange={() => toggleSelected(row.symbolicName)}
                    disabled={isBusy}
                    aria-label={`Select ${row.symbolicName}`}
                  />
                )}
                <span class="flex-1 truncate font-mono text-xs" title={row.symbolicName}>{row.symbolicName}</span>
                <span class={`shrink-0 font-mono text-xs font-semibold tabular-nums ${isHot ? 'text-error' : 'text-base-content/80'}`}>
                  {formatCount(row.count)}
                </span>
                {throttled ? (
                  <span class="badge badge-success badge-outline badge-sm gap-1" title="Log level set to ERROR">
                    <Check size={12} /> ERROR
                  </span>
                ) : (
                  <button
                    class="btn btn-primary btn-soft btn-xs gap-1"
                    onClick={() => handleThrottle(row.symbolicName)}
                    disabled={throttlingNow === row.symbolicName}
                    title="Set log level to ERROR"
                  >
                    {throttlingNow === row.symbolicName ? (
                      <span class="animate-spin"><LoaderCircle size={14} /></span>
                    ) : (
                      <>
                        <Zap size={14} />
                        <span>{t('logThrottleSilence')}</span>
                      </>
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
