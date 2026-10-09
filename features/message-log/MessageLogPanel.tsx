import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { Info, ExternalLink, Activity, RefreshCw, Layers, Check, X, Clock, Ban } from 'lucide-preact';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { showToast } from '@/features/shared/toast';
import { devLog } from '@/features/shared/dev-logger';
import { t, tSub } from '@/features/shared/i18n';
import { getPreferences, onPreferencesChange, DEFAULT_PREFERENCES } from '@/features/shared/preferences';
import { isCpiUrl } from '@/features/shared/cpi-url';
import { mplStatusTone, TONE_DISC_CLASS, type StatusTone } from '@/features/shared/status-tone';
import { EmptyState } from '@/features/shared/EmptyState';
import { formatDate, formatTime } from '@/features/shared/time-format';
import { extractIFlowId } from '@/features/trace-mode/trace-api';
import { fetchMessages, fetchRuns } from './MplApiClient';
import { parseODataDate } from './mpl-types';
import type { MessageProcessingLog } from './mpl-types';

const LOG_TAG = 'MessageLog';
const INITIAL_FETCH_DELAY_MS = 2000;

type FilterCategory = 'success' | 'error' | 'processing';
const FILTER_CATEGORIES: FilterCategory[] = ['success', 'error', 'processing'];

const STATUS_TO_FILTER: Record<string, FilterCategory> = {
  COMPLETED: 'success',
  FAILED: 'error',
  PROCESSING: 'processing',
  ESCALATED: 'processing',
  RETRY: 'processing',
  CANCELLED: 'processing',
  ABANDONED: 'processing',
};

const FILTER_TONE: Record<FilterCategory, StatusTone> = {
  success: 'success',
  error: 'error',
  processing: 'warning',
};

const FILTER_LABEL: Record<FilterCategory, () => string> = {
  success: () => t('msgLogFilterCompleted'),
  error: () => t('msgLogFilterFailed'),
  processing: () => t('msgLogFilterOther'),
};

// Icons double up the color coding so filters stay distinguishable for
// red/green color-blind users (deuteranopia/protanopia), not just by hue.
const FILTER_ICON: Record<FilterCategory, typeof Check> = {
  success: Check,
  error: X,
  processing: Clock,
};

// Same idea, applied per-row: mirrors the filter dot icons so the individual
// message status isn't conveyed by color alone either.
const STATUS_ICON: Record<string, typeof Check> = {
  COMPLETED: Check,
  FAILED: X,
  PROCESSING: Clock,
  ESCALATED: Clock,
  RETRY: Clock,
  CANCELLED: Ban,
  DISCARDED: Ban,
  ABANDONED: Ban,
};

interface MessageRowProps {
  msg: MessageProcessingLog;
  onShowDetail: (guid: string) => void;
  onStartInlineTrace?: (guid: string) => void;
  activeInlineTrace?: string | null;
}

function MessageRow({ msg, onShowDetail, onStartInlineTrace, activeInlineTrace }: MessageRowProps) {
  const tone = mplStatusTone(msg.Status);
  const StatusIcon = STATUS_ICON[msg.Status];
  const endDate = parseODataDate(msg.LogEnd);
  const inlineTraceShown = activeInlineTrace === msg.MessageGuid;

  async function openTrace() {
    try {
      const baseUrl = getCpiBaseUrl();
      const runs = await fetchRuns(baseUrl, msg.MessageGuid);
      if (runs.length === 0) {
        showToast(t('msgLogNoTraceRuns'), 'warning');
        return;
      }
      const runId = runs[0]!.Id;
      const traceUrl = `${window.location.origin}${baseUrl}/shell/monitoring/MessageProcessingRun?MessageGuid='${msg.MessageGuid}'&RunId='${runId}'`;
      window.open(traceUrl, '_blank');
      devLog.info(LOG_TAG, 'Opened trace', { messageGuid: msg.MessageGuid, runId });
    } catch (error) {
      devLog.error(LOG_TAG, 'Failed to open trace', { error: String(error) });
      showToast(`${t('msgLogTraceLoadFailed')}: ${error}`, 'error');
    }
  }

  return (
    <div class={`group flex cursor-default items-center gap-2.5 px-3 py-1.5 ${inlineTraceShown ? 'bg-primary/10' : 'hover:bg-base-200'}`}>
      <span
        title={msg.Status}
        class={`flex size-4 shrink-0 items-center justify-center rounded-full ${TONE_DISC_CLASS[tone]}`}
      >
        {StatusIcon && <StatusIcon size={10} strokeWidth={3.2} />}
      </span>
      <span class="font-mono text-xs font-medium">{formatTime(endDate)}</span>
      <span class="rounded-[4px] bg-base-200 px-1.5 py-px font-mono text-[11px] font-bold text-muted">
        {msg.LogLevel.charAt(0)}
      </span>
      <div class="flex-1" />
      <div class="flex gap-0.5">
        <button
          class="btn btn-ghost btn-xs btn-square"
          title={t('msgDetailMessageDetail')}
          onClick={(e) => { e.stopPropagation(); onShowDetail(msg.MessageGuid); }}
        >
          <Info size={16} />
        </button>
        {msg.AlternateWebLink && isCpiUrl(msg.AlternateWebLink) && (
          <button
            class="btn btn-ghost btn-xs btn-square"
            title={t('msgLogOpenMonitoring')}
            onClick={(e) => { e.stopPropagation(); window.open(msg.AlternateWebLink, '_blank'); }}
          >
            <ExternalLink size={16} />
          </button>
        )}
        {msg.LogLevel === 'TRACE' && (
          <>
            <button
              class={`btn btn-xs btn-square ${inlineTraceShown ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={inlineTraceShown}
              title={t('msgLogShowInlineTrace')}
              onClick={(e) => { e.stopPropagation(); onStartInlineTrace?.(msg.MessageGuid); }}
            >
              <Layers size={16} />
            </button>
            <button
              class="btn btn-ghost btn-xs btn-square"
              title={t('msgLogOpenTrace')}
              onClick={(e) => { e.stopPropagation(); openTrace(); }}
            >
              <Activity size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// A filter chip: the status disc names the category, the ink fill (and
// aria-pressed) says the filter is on.
function FilterChip({ category, active, onClick }: { category: FilterCategory; active: boolean; onClick: () => void }) {
  const Icon = FILTER_ICON[category];
  const label = FILTER_LABEL[category]();
  return (
    <button
      class={`btn btn-xs h-6 min-h-0 px-1.5 ${active ? 'btn-neutral' : 'btn-outline border-base-300'}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <span class={`flex size-3.5 items-center justify-center rounded-full ${TONE_DISC_CLASS[FILTER_TONE[category]]}`}>
        <Icon size={9} strokeWidth={3.2} />
      </span>
    </button>
  );
}

interface MessageLogPanelProps {
  onShowDetail: (guid: string, baseUrl: string) => void;
  onStartInlineTrace?: (guid: string) => void;
  activeInlineTrace?: string | null;
}

export function MessageLogPanel({ onShowDetail, onStartInlineTrace, activeInlineTrace }: MessageLogPanelProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [messages, setMessages] = useState<MessageProcessingLog[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<FilterCategory>>(
    new Set(['success', 'error', 'processing']),
  );
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshSec, setRefreshSec] = useState(DEFAULT_PREFERENCES.messageLogRefreshSec);
  const [messageLimit, setMessageLimit] = useState(10);
  const [lastRefresh, setLastRefresh] = useState('');

  const messageLimitRef = useRef(messageLimit);
  useEffect(() => {
    messageLimitRef.current = messageLimit;
  }, [messageLimit]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const iflowId = extractIFlowId();
    if (!iflowId) {
      devLog.warn(LOG_TAG, 'Cannot determine iFlow ID from URL');
      return;
    }
    try {
      const baseUrl = getCpiBaseUrl();
      const data = await fetchMessages(baseUrl, iflowId, messageLimitRef.current);
      if (mountedRef.current) {
        setMessages(data);
        setLastRefresh(formatTime(new Date()));
        devLog.info(LOG_TAG, `Refreshed: ${data.length} messages`, { iflowId });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      devLog.warn(LOG_TAG, 'Failed to fetch messages', { error: msg });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => refresh(), INITIAL_FETCH_DELAY_MS);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [refresh]);

  // Interval is a user preference (Options page); follow changes live.
  useEffect(() => {
    let active = true;
    getPreferences().then(p => { if (active) setRefreshSec(p.messageLogRefreshSec); });
    const unsubscribe = onPreferencesChange(p => setRefreshSec(p.messageLogRefreshSec));
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (autoRefresh && panelOpen) {
      timerRef.current = setInterval(() => refresh(), refreshSec * 1000);
      devLog.debug(LOG_TAG, 'Auto-refresh started');
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        devLog.debug(LOG_TAG, 'Auto-refresh stopped');
      }
    };
  }, [autoRefresh, panelOpen, refresh, refreshSec]);

  function toggleFilter(cat: FilterCategory) {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function togglePanel() {
    const next = !panelOpen;
    setPanelOpen(next);
    if (next) refresh();
  }

  function handleLimitChange(e: Event) {
    e.stopPropagation();
    const val = Number((e.target as HTMLSelectElement).value);
    setMessageLimit(val);
    messageLimitRef.current = val;
    refresh();
  }

  function handleShowDetail(guid: string) {
    onShowDetail(guid, getCpiBaseUrl());
  }

  const filtered = messages.filter(m => {
    const cat = STATUS_TO_FILTER[m.Status];
    return cat ? activeFilters.has(cat) : true;
  });

  const groups = new Map<string, MessageProcessingLog[]>();
  for (const msg of filtered) {
    const key = formatDate(parseODataDate(msg.LogEnd));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(msg);
  }

  return (
    <div class="relative w-full">
      <button
        class={`btn btn-ghost btn-sm w-full justify-start gap-2 ${panelOpen ? 'bg-base-200' : ''}`}
        aria-expanded={panelOpen}
        onClick={(e) => { e.stopPropagation(); togglePanel(); }}
      >
        <Activity size={16} />
        <span>{t('msgLogMessages')}</span>
        {messages.length > 0 && (
          <span class="badge badge-ghost badge-sm ml-auto font-mono">{messages.length}</span>
        )}
      </button>

      {panelOpen && (
        <div class="absolute top-[calc(100%+6px)] right-0 z-[10000] w-96 overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-float" onPointerDown={(e) => e.stopPropagation()}>
          <div class="flex items-center gap-1.5 border-b border-base-300 px-2 py-2">
            <button
              class="btn btn-ghost btn-xs btn-square"
              title={t('refresh')}
              onClick={(e) => { e.stopPropagation(); refresh(); }}
            >
              <RefreshCw size={14} />
            </button>

            {/* The spark dot is the live indicator: it pulses while auto-refresh runs. */}
            <button
              class={`btn btn-xs h-6 min-h-0 gap-1.5 ${autoRefresh ? 'btn-neutral' : 'btn-outline border-base-300'}`}
              title={tSub('msgLogAutoRefresh', String(refreshSec))}
              aria-pressed={autoRefresh}
              onClick={(e) => { e.stopPropagation(); setAutoRefresh(v => !v); }}
            >
              {autoRefresh && <span class="size-2 rounded-full bg-accent motion-safe:animate-pulse" />}
              {t('msgLogAuto')}
            </button>

            {FILTER_CATEGORIES.map(cat => (
              <FilterChip
                key={cat}
                category={cat}
                active={activeFilters.has(cat)}
                onClick={() => toggleFilter(cat)}
              />
            ))}

            <select
              class="select select-bordered select-xs w-14 min-w-0"
              title={t('msgLogMessageLimit')}
              value={messageLimit}
              onChange={handleLimitChange}
              onClick={(e) => e.stopPropagation()}
            >
              {[10, 25, 50].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <div class="flex-1" />
            <span class="font-mono text-[11px] text-muted">{lastRefresh}</span>
          </div>

          <div class="max-h-[300px] overflow-y-auto pb-1">
            {messages.length === 0 ? (
              <EmptyState title={t('msgLogNoMessages')}>{t('msgLogNoMessagesHint')}</EmptyState>
            ) : filtered.length === 0 ? (
              <EmptyState title={t('msgLogNoMatching')}>{t('msgLogNoMatchingHint')}</EmptyState>
            ) : (
              Array.from(groups.entries()).map(([dateKey, msgs]) => (
                <div key={dateKey}>
                  <div class="flex items-center gap-2 px-3 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-[0.07em] text-muted">
                    <span>{dateKey}</span>
                    <div class="h-px flex-1 bg-base-300" />
                  </div>
                  {msgs.map(msg => (
                    <MessageRow
                      key={msg.MessageGuid}
                      msg={msg}
                      onShowDetail={handleShowDetail}
                      onStartInlineTrace={onStartInlineTrace}
                      activeInlineTrace={activeInlineTrace}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
