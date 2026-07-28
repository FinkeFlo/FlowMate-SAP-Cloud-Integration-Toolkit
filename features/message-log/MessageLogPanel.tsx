import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { Info, ExternalLink, Activity, RefreshCw, Layers } from 'lucide-preact';
import { getCpiBaseUrl } from '@/features/shared/navigation';
import { showToast } from '@/features/shared/toast';
import { devLog } from '@/features/shared/dev-logger';
import { MPL_STATUS_COLORS } from '@/features/shared/constants';
import { extractIFlowId } from '@/features/trace-mode/trace-api';
import { fetchMessages, fetchRuns } from './MplApiClient';
import { parseODataDate } from './mpl-types';
import type { MessageProcessingLog, MplStatus } from './mpl-types';
import './MessageLogPanel.css';

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

const FILTER_COLORS: Record<FilterCategory, string> = {
  success: '#10b981',
  error: '#ef4444',
  processing: '#f59e0b',
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

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

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
    <div class="mpl-row" style={{ borderLeft: `3px solid ${color}` }}>
      <div class="mpl-row-pad" />
      <span
        title={msg.Status}
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          boxShadow: `0 0 6px ${color}80`,
        }}
      />
      <span class="mpl-row-time">{formatTime(endDate)}</span>
      <span class="mpl-row-level" title={msg.LogLevel}>{msg.LogLevel.charAt(0)}</span>
      <div style={{ flex: 1 }} />
      <div class="mpl-actions">
        <button
          class="mpl-action-btn"
          title="Message Details"
          onClick={(e) => { e.stopPropagation(); onShowDetail(msg.MessageGuid); }}
        >
          <Info size={16} />
        </button>
        {msg.AlternateWebLink && (
          <button
            class="mpl-action-btn"
            title="Open in Monitoring"
            onClick={(e) => { e.stopPropagation(); window.open(msg.AlternateWebLink, '_blank'); }}
          >
            <ExternalLink size={16} />
          </button>
        )}
        {msg.LogLevel === 'TRACE' && (
          <>
            <button
              class={`mpl-action-btn ${activeInlineTrace === msg.MessageGuid ? 'mpl-action-btn--trace-active' : ''}`}
              title="Show Inline Trace"
              onClick={(e) => { e.stopPropagation(); onStartInlineTrace?.(msg.MessageGuid); }}
            >
              <Layers size={16} />
            </button>
            <button
              class="mpl-action-btn"
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
  const color = FILTER_COLORS[category];
  return (
    <button
      class={`mpl-filter-dot ${active ? '' : 'mpl-filter-dot--inactive'}`}
      title={FILTER_LABELS[category]}
      style={active ? { borderColor: `${color}60` } : undefined}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 6px ${color}80`,
          display: 'block',
        }}
      />
    </button>
  );
}

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------

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

  const autoRefreshRef = useRef(autoRefresh);
  autoRefreshRef.current = autoRefresh;
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;
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
      // Network errors during polling are expected (page navigation, timeout) — don't escalate
      const msg = error instanceof Error ? error.message : String(error);
      devLog.warn(LOG_TAG, 'Failed to fetch messages', { error: msg });
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => refresh(), INITIAL_FETCH_DELAY_MS);
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [refresh]);

  // Auto-refresh
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

  // Filtered + grouped
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

  const filterCategories = FILTER_CATEGORIES;

  return (
    <div style={{ position: 'relative' }}>
      {/* Main button */}
      <button class="mpl-button" onClick={(e) => { e.stopPropagation(); togglePanel(); }}>
        <Activity size={16} />
        <span>Messages</span>
      </button>

      {/* Panel */}
      {panelOpen && (
        <div class="mpl-panel" onPointerDown={(e) => e.stopPropagation()}>
          {/* Header */}
          <div class="mpl-header">
            <button
              class="mpl-header-btn"
              title="Refresh"
              onClick={(e) => { e.stopPropagation(); refresh(); }}
            >
              <RefreshCw size={16} />
            </button>

            <button
              class={`mpl-header-btn ${autoRefresh ? 'mpl-header-btn--auto-active' : ''}`}
              title="Auto-refresh (30s)"
              onClick={(e) => { e.stopPropagation(); setAutoRefresh(v => !v); }}
            >
              Auto
            </button>

            {filterCategories.map(cat => (
              <FilterDot
                key={cat}
                category={cat}
                active={activeFilters.has(cat)}
                onClick={() => toggleFilter(cat)}
              />
            ))}

            <select
              class="mpl-limit-select"
              title="Message limit"
              value={messageLimit}
              onChange={handleLimitChange}
              onClick={(e) => e.stopPropagation()}
            >
              {[10, 25, 50].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <div style={{ flex: 1 }} />
            <span class="mpl-last-refresh">{lastRefresh}</span>
          </div>

          {/* List */}
          <div class="mpl-list">
            {messages.length === 0 ? (
              <div class="mpl-empty">
                <div class="mpl-empty-icon"><Activity size={24} /></div>
                <span>No messages found</span>
              </div>
            ) : filtered.length === 0 ? (
              <div class="mpl-empty">
                <div class="mpl-empty-icon"><Activity size={24} /></div>
                <span>No matching messages</span>
              </div>
            ) : (
              Array.from(groups.entries()).map(([dateKey, msgs]) => (
                <div key={dateKey}>
                  <div class="mpl-date-sep">
                    <div class="mpl-date-sep-line" />
                    <span class="mpl-date-sep-label">{dateKey}</span>
                    <div class="mpl-date-sep-line" />
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
