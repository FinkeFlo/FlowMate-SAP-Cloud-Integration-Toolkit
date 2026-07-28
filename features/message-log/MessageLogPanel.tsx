import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { Info, ExternalLink, Activity, RefreshCw, Layers } from 'lucide-preact';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { showToast } from '@/features/shared/toast';
import { devLog } from '@/features/shared/dev-logger';
import { t } from '@/features/shared/i18n';
import { MPL_STATUS_COLORS } from '@/features/shared/constants';
import { extractIFlowId } from '@/features/trace-mode/trace-api';
import { fetchMessages, fetchRuns } from './MplApiClient';
import { parseODataDate } from './mpl-types';
import type { MessageProcessingLog, MplStatus } from './mpl-types';

const LOG_TAG = 'MessageLog';
const AUTO_REFRESH_INTERVAL_MS = 30_000;
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

const FILTER_DOT_CLASS: Record<FilterCategory, string> = {
  success: 'bg-success',
  error: 'bg-error',
  processing: 'bg-warning',
};

const FILTER_BORDER_CLASS: Record<FilterCategory, string> = {
  success: 'border-success/30',
  error: 'border-error/30',
  processing: 'border-warning/30',
};

const FILTER_LABELS: Record<FilterCategory, string> = {
  success: 'Filter: Completed',
  error: 'Filter: Failed',
  processing: 'Filter: Processing / Escalated / Retry',
};

function getStatusColor(status: MplStatus): string {
  return MPL_STATUS_COLORS[status] ?? '#6b7280';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface MessageRowProps {
  msg: MessageProcessingLog;
  onShowDetail: (guid: string) => void;
  onStartInlineTrace?: (guid: string) => void;
  activeInlineTrace?: string | null;
}

function MessageRow({ msg, onShowDetail, onStartInlineTrace, activeInlineTrace }: MessageRowProps) {
  const color = getStatusColor(msg.Status);
  const endDate = parseODataDate(msg.LogEnd);

  async function openTrace() {
    try {
      const baseUrl = getCpiBaseUrl();
      const runs = await fetchRuns(baseUrl, msg.MessageGuid);
      if (runs.length === 0) {
        showToast('No trace runs found for this message', 'warning');
        return;
      }
      const runId = runs[0].Id;
      const traceUrl = `${window.location.origin}${baseUrl}/shell/monitoring/MessageProcessingRun?MessageGuid='${msg.MessageGuid}'&RunId='${runId}'`;
      window.open(traceUrl, '_blank');
      devLog.info(LOG_TAG, 'Opened trace', { messageGuid: msg.MessageGuid, runId });
    } catch (error) {
      devLog.error(LOG_TAG, 'Failed to open trace', { error: String(error) });
      showToast(`Failed to load trace: ${error}`, 'error');
    }
  }

  return (
    <div class="group flex cursor-default items-center gap-2 border-b border-base-300/40 px-3 py-2 hover:bg-base-200/60" style={{ borderLeft: `3px solid ${color}` }}>
      <div class="w-1.5 shrink-0" />
      <span
        title={msg.Status}
        class="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
      />
      <span class="font-mono text-xs text-base-content/80">{formatTime(endDate)}</span>
      <span class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-base-content/60">
        {msg.LogLevel.charAt(0)}
      </span>
      <div class="flex-1" />
      <div class="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          class="btn btn-ghost btn-xs btn-square"
          title="Message Details"
          onClick={(e) => { e.stopPropagation(); onShowDetail(msg.MessageGuid); }}
        >
          <Info size={16} />
        </button>
        {msg.AlternateWebLink && (
          <button
            class="btn btn-ghost btn-xs btn-square"
            title="Open in Monitoring"
            onClick={(e) => { e.stopPropagation(); window.open(msg.AlternateWebLink, '_blank'); }}
          >
            <ExternalLink size={16} />
          </button>
        )}
        {msg.LogLevel === 'TRACE' && (
          <>
            <button
              class={`btn btn-xs btn-square ${activeInlineTrace === msg.MessageGuid ? 'btn-success' : 'btn-ghost'}`}
              title="Show Inline Trace"
              onClick={(e) => { e.stopPropagation(); onStartInlineTrace?.(msg.MessageGuid); }}
            >
              <Layers size={16} />
            </button>
            <button
              class="btn btn-ghost btn-xs btn-square"
              title="Open Trace"
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

function FilterDot({ category, active, onClick }: { category: FilterCategory; active: boolean; onClick: () => void }) {
  return (
    <button
      class={`btn btn-circle btn-xs h-6 min-h-0 w-6 p-0 ${active ? FILTER_BORDER_CLASS[category] : 'border-base-300 opacity-40'}`}
      title={FILTER_LABELS[category]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <span class={`block h-2.5 w-2.5 rounded-full ${FILTER_DOT_CLASS[category]}`} />
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
  const [messageLimit, setMessageLimit] = useState(10);
  const [lastRefresh, setLastRefresh] = useState('');

  const messageLimitRef = useRef(messageLimit);
  messageLimitRef.current = messageLimit;
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

  useEffect(() => {
    if (autoRefresh && panelOpen) {
      timerRef.current = setInterval(() => refresh(), AUTO_REFRESH_INTERVAL_MS);
      devLog.debug(LOG_TAG, 'Auto-refresh started');
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        devLog.debug(LOG_TAG, 'Auto-refresh stopped');
      }
    };
  }, [autoRefresh, panelOpen, refresh]);

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
    const key = formatDateKey(parseODataDate(msg.LogEnd));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(msg);
  }

  return (
    <div class="relative w-full">
      <button class="btn btn-primary btn-sm w-full justify-start gap-2" onClick={(e) => { e.stopPropagation(); togglePanel(); }}>
        <Activity size={16} />
        <span>{t('msgLogMessages')}</span>
      </button>

      {panelOpen && (
        <div class="absolute top-[calc(100%+6px)] right-0 z-[10000] w-[370px] overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl" onPointerDown={(e) => e.stopPropagation()}>
          <div class="flex items-center gap-2 border-b border-base-300 px-3 py-2">
            <button
              class="btn btn-ghost btn-xs btn-square"
              title="Refresh"
              onClick={(e) => { e.stopPropagation(); refresh(); }}
            >
              <RefreshCw size={16} />
            </button>

            <button
              class={`btn btn-xs ${autoRefresh ? 'btn-primary' : 'btn-ghost'}`}
              title="Auto-refresh (30s)"
              onClick={(e) => { e.stopPropagation(); setAutoRefresh(v => !v); }}
            >
              Auto
            </button>

            {FILTER_CATEGORIES.map(cat => (
              <FilterDot
                key={cat}
                category={cat}
                active={activeFilters.has(cat)}
                onClick={() => toggleFilter(cat)}
              />
            ))}

            <select
              class="select select-bordered select-xs w-14 min-w-0"
              title="Message limit"
              value={messageLimit}
              onChange={handleLimitChange}
              onClick={(e) => e.stopPropagation()}
            >
              {[10, 25, 50].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <div class="flex-1" />
            <span class="font-mono text-[11px] text-base-content/50">{lastRefresh}</span>
          </div>

          <div class="max-h-[300px] overflow-y-auto py-1">
            {messages.length === 0 ? (
              <div class="flex flex-col items-center gap-2 px-4 py-8 text-center text-xs text-base-content/50">
                <Activity size={24} class="opacity-50" />
                <span>{t('msgLogNoMessages')}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div class="flex flex-col items-center gap-2 px-4 py-8 text-center text-xs text-base-content/50">
                <Activity size={24} class="opacity-50" />
                <span>{t('msgLogNoMatching')}</span>
              </div>
            ) : (
              Array.from(groups.entries()).map(([dateKey, msgs]) => (
                <div key={dateKey}>
                  <div class="flex items-center gap-2 px-3 py-2">
                    <div class="h-px flex-1 bg-base-300" />
                    <span class="text-[10px] font-semibold tracking-wide text-base-content/40">{dateKey}</span>
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
