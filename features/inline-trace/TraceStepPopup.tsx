/**
 * TraceStepPopup — Detail popup for a single trace step.
 *
 * Shows tabs: Properties, Headers, Body, Log, Info, and Error (if present).
 * Supports Previous/Next navigation between steps.
 */

import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import { X, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-preact';
import { t, tSub } from '@/features/shared/i18n';
import { devLog } from '@/features/shared/dev-logger';
import { CodeViewer } from '@/features/shared/CodeViewer';
import { parseODataDate } from '@/features/message-log/mpl-types';
import {
  fetchTraceMessages,
  fetchTraceBody,
  fetchTraceExchangeProperties,
  fetchTraceHeaders,
  fetchRunStepDetail,
} from './InlineTraceApiClient';
import type { InlineTraceElement, TraceProperty, PerformanceTier } from './inline-trace-types';
import './TraceStepPopup.css';

const LOG_TAG = 'TraceStepPopup';

type TabId = 'properties' | 'headers' | 'body' | 'log' | 'info' | 'error';

export interface TracePopupState {
  element: InlineTraceElement;
  allElements: InlineTraceElement[];
}

interface TraceStepPopupProps {
  element: InlineTraceElement;
  allElements: InlineTraceElement[];
  baseUrl: string;
  onNavigate: (element: InlineTraceElement) => void;
  onClose: () => void;
}

function formatDateTime(dateStr: string): string {
  const date = parseODataDate(dateStr);
  return date.toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

/** Uses the same thresholds as InlineTraceOverlay.classifyPerformance (10% band). */
function getDurationTier(ms: number, avgMs: number): PerformanceTier | null {
  if (ms <= 0 || avgMs <= 0) return null;
  if (Math.abs(ms - avgMs) < avgMs * 0.1) return 'avg';
  return ms > avgMs ? 'above-avg' : 'below-avg';
}

const TIER_CSS: Record<PerformanceTier, string> = {
  'max': 'trace-duration-badge--slow',
  'above-avg': 'trace-duration-badge--slow',
  'avg': 'trace-duration-badge--normal',
  'below-avg': 'trace-duration-badge--fast',
  'min': 'trace-duration-badge--fast',
};

// --------------------------------------------------------------------------
// Shared property table component (used by Properties, Headers, Log tabs)
// --------------------------------------------------------------------------

function TracePropertyTable({ data }: { data: TraceProperty[] }) {
  return (
    <table class="trace-prop-table">
      <tbody>
        {data.map((p, i) => (
          <tr key={i}>
            <td class="trace-prop-label">{p.Name}</td>
            <td class="trace-prop-value">{p.Value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --------------------------------------------------------------------------
// Lazy-loaded tab contents
// --------------------------------------------------------------------------

interface TraceTabProps {
  traceId: number | null;
  baseUrl: string;
}

function PropertiesTab({ traceId, baseUrl }: TraceTabProps) {
  const [data, setData] = useState<TraceProperty[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (traceId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const props = await fetchTraceExchangeProperties(baseUrl, traceId);
        if (!cancelled) setData(props);
      } catch (err) {
        devLog.error(LOG_TAG, 'Failed to load properties', { error: String(err) });
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl, traceId]);

  if (error) return <div class="trace-tab-error">{tSub('traceFailedToLoad', error)}</div>;
  if (data === null) return <div class="trace-loading"><span class="flowmate-spin"><LoaderCircle size={16} /></span> {t('traceLoadingProperties')}</div>;
  if (data.length === 0) return <div class="trace-loading">{t('traceNoExchangeProperties')}</div>;

  return <TracePropertyTable data={data} />;
}

function HeadersTab({ traceId, baseUrl }: TraceTabProps) {
  const [data, setData] = useState<TraceProperty[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (traceId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const headers = await fetchTraceHeaders(baseUrl, traceId);
        if (!cancelled) setData(headers);
      } catch (err) {
        devLog.error(LOG_TAG, 'Failed to load headers', { error: String(err) });
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl, traceId]);

  if (error) return <div class="trace-tab-error">{tSub('traceFailedToLoad', error)}</div>;
  if (data === null) return <div class="trace-loading"><span class="flowmate-spin"><LoaderCircle size={16} /></span> {t('traceLoadingHeaders')}</div>;
  if (data.length === 0) return <div class="trace-loading">{t('traceNoMessageHeaders')}</div>;

  return <TracePropertyTable data={data} />;
}

function BodyTab({ traceId, baseUrl }: TraceTabProps) {
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (traceId === null) return;
    let cancelled = false;
    (async () => {
      try {
        const text = await fetchTraceBody(baseUrl, traceId);
        if (!cancelled) setBody(text);
      } catch (err) {
        devLog.error(LOG_TAG, 'Failed to load body', { error: String(err) });
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl, traceId]);

  if (error) return <div class="trace-tab-error">{tSub('traceFailedToLoad', error)}</div>;
  if (body === null) return <div class="trace-loading"><span class="flowmate-spin"><LoaderCircle size={16} /></span> {t('traceLoadingBody')}</div>;
  if (body === '') return <div class="trace-loading">{t('traceNoBodyContent')}</div>;

  return <CodeViewer content={body} maxHeight="500px" />;
}

function LogTab({ baseUrl, element }: { baseUrl: string; element: InlineTraceElement }) {
  const [data, setData] = useState<TraceProperty[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await fetchRunStepDetail(baseUrl, element.runId, element.childCount);
        if (!cancelled) setData(d.RunStepProperties?.results ?? []);
      } catch (err) {
        devLog.error(LOG_TAG, 'Failed to load log', { error: String(err) });
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl, element.runId, element.childCount]);

  if (error) return <div class="trace-tab-error">{tSub('traceFailedToLoad', error)}</div>;
  if (data === null) return <div class="trace-loading"><span class="flowmate-spin"><LoaderCircle size={16} /></span> {t('traceLoadingLog')}</div>;
  if (data.length === 0) return <div class="trace-loading">{t('traceNoLogProperties')}</div>;

  return <TracePropertyTable data={data} />;
}

function InfoTab({ element, avgDurationMs }: { element: InlineTraceElement; avgDurationMs: number }) {
  const tier = getDurationTier(element.durationMs, avgDurationMs);
  const badgeClass = tier ? TIER_CSS[tier] : 'trace-duration-badge--normal';

  return (
    <table class="trace-prop-table">
      <tbody>
        <tr class="trace-section-row"><td colSpan={2}>{t('traceTiming')}</td></tr>
        <tr>
          <td class="trace-prop-label">{t('traceStart')}</td>
          <td class="trace-prop-value">{formatDateTime(element.stepStart)}</td>
        </tr>
        <tr>
          <td class="trace-prop-label">{t('traceStop')}</td>
          <td class="trace-prop-value">{formatDateTime(element.stepStop)}</td>
        </tr>
        <tr>
          <td class="trace-prop-label">{t('traceDuration')}</td>
          <td class="trace-prop-value">
            <span class={`trace-duration-badge ${badgeClass}`}>
              {formatDuration(element.durationMs)}
            </span>
          </td>
        </tr>
        <tr class="trace-section-row"><td colSpan={2}>{t('traceIdentifiers')}</td></tr>
        <tr>
          <td class="trace-prop-label">{t('traceStepId')}</td>
          <td class="trace-prop-value">{element.stepId}</td>
        </tr>
        <tr>
          <td class="trace-prop-label">{t('traceModelStepId')}</td>
          <td class="trace-prop-value">{element.modelStepId}</td>
        </tr>
        <tr>
          <td class="trace-prop-label">{t('traceRunId')}</td>
          <td class="trace-prop-value">{element.runId}</td>
        </tr>
        <tr>
          <td class="trace-prop-label">{t('traceBranchId')}</td>
          <td class="trace-prop-value">{element.branchId}</td>
        </tr>
        <tr>
          <td class="trace-prop-label">{t('traceChildCount')}</td>
          <td class="trace-prop-value">{element.childCount}</td>
        </tr>
      </tbody>
    </table>
  );
}

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------

export function TraceStepPopup({ element, allElements, baseUrl, onNavigate, onClose }: TraceStepPopupProps) {
  const [activeTab, setActiveTab] = useState<TabId>('properties');
  const [traceId, setTraceId] = useState<number | null>(null);

  const currentIndex = useMemo(
    () => allElements.findIndex(e => e.stepId === element.stepId),
    [allElements, element.stepId],
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allElements.length - 1;

  // Compute average duration once for the whole trace session
  const avgDurationMs = useMemo(() => {
    const durations = allElements.filter(e => e.durationMs > 0).map(e => e.durationMs);
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }, [allElements]);

  // Fetch TraceId once per step (shared by Properties, Headers, Body tabs)
  useEffect(() => {
    let cancelled = false;
    setTraceId(null);
    (async () => {
      try {
        const msgs = await fetchTraceMessages(baseUrl, element.runId, element.childCount);
        if (!cancelled && msgs.length > 0) {
          setTraceId(msgs[0].TraceId);
        }
      } catch (err) {
        devLog.error(LOG_TAG, 'Failed to fetch TraceId', { error: String(err) });
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl, element.runId, element.childCount]);

  // Keyboard navigation (skip when focus is inside CodeMirror or an input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.('.cm-editor') || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(allElements[currentIndex - 1]);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(allElements[currentIndex + 1]);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, onNavigate, hasPrev, hasNext, currentIndex, allElements]);

  const handleOverlayClick = useCallback((e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('trace-popup-overlay')) {
      onClose();
    }
  }, [onClose]);

  const tabs: Array<{ id: TabId; label: string; show: boolean }> = [
    { id: 'properties', label: t('traceProperties'), show: true },
    { id: 'headers', label: t('traceHeaders'), show: true },
    { id: 'body', label: t('traceBody'), show: true },
    { id: 'log', label: t('traceLog'), show: true },
    { id: 'info', label: t('traceInfo'), show: true },
    { id: 'error', label: t('traceError'), show: !!element.error },
  ];

  return (
    <div class="trace-popup-overlay" onClick={handleOverlayClick}>
      <div class="trace-popup-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div class="trace-popup-header">
          <div class="trace-popup-header-left">
            <span
              class={`trace-status-dot ${element.error ? 'trace-status-dot--error' : 'trace-status-dot--ok'}`}
            />
            <span class="trace-popup-title">{t('traceStep')}</span>
            <span class="trace-popup-step-id">{element.modelStepId}</span>
          </div>
          <div class="trace-popup-header-right">
            <div class="trace-popup-nav">
              <button
                class="trace-popup-nav-btn"
                title="Previous step (←)"
                disabled={!hasPrev}
                onClick={() => hasPrev && onNavigate(allElements[currentIndex - 1])}
              >
                <ChevronLeft size={16} />
              </button>
              <span class="trace-popup-counter">{currentIndex + 1}/{allElements.length}</span>
              <button
                class="trace-popup-nav-btn"
                title="Next step"
                disabled={!hasNext}
                onClick={() => hasNext && onNavigate(allElements[currentIndex + 1])}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button class="trace-popup-nav-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div class="trace-popup-body">
          <div class="trace-tab-bar">
            {tabs.filter(t => t.show).map(tab => (
              <button
                key={tab.id}
                class={`trace-tab ${activeTab === tab.id ? 'trace-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div class="trace-tab-content">
            <div style={{ display: activeTab === 'properties' ? 'block' : 'none' }}>
              <PropertiesTab key={element.stepId} traceId={traceId} baseUrl={baseUrl} />
            </div>
            <div style={{ display: activeTab === 'headers' ? 'block' : 'none' }}>
              <HeadersTab key={element.stepId} traceId={traceId} baseUrl={baseUrl} />
            </div>
            <div style={{ display: activeTab === 'body' ? 'block' : 'none' }}>
              <BodyTab key={element.stepId} traceId={traceId} baseUrl={baseUrl} />
            </div>
            <div style={{ display: activeTab === 'log' ? 'block' : 'none' }}>
              <LogTab key={element.stepId} baseUrl={baseUrl} element={element} />
            </div>
            <div style={{ display: activeTab === 'info' ? 'block' : 'none' }}>
              <InfoTab element={element} avgDurationMs={avgDurationMs} />
            </div>
            {element.error && (
              <div style={{ display: activeTab === 'error' ? 'block' : 'none' }}>
                <div class="trace-error-banner">{element.error}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
