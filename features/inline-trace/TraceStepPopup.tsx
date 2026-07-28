/**
 * TraceStepPopup — Detail popup for a single trace step.
 *
 * Shows tabs: Properties, Headers, Body, Log, Info, and Error (if present).
 * Supports Previous/Next navigation between steps.
 */

import { useState, useEffect, useMemo } from 'preact/hooks';
import { X, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-preact';
import { t, tSub } from '@/features/shared/i18n';
import { devLog } from '@/features/shared/dev-logger';
import { CodeViewer } from '@/features/shared/CodeViewer';
import { DockPanel } from '@/features/shared/DockPanel';
import { parseODataDate } from '@/features/message-log/mpl-types';
import {
  fetchTraceMessages,
  fetchTraceBody,
  fetchTraceExchangeProperties,
  fetchTraceHeaders,
  fetchRunStepDetail,
} from './InlineTraceApiClient';
import type { InlineTraceElement, TraceProperty, PerformanceTier } from './inline-trace-types';

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

function getDurationTier(ms: number, avgMs: number): PerformanceTier | null {
  if (ms <= 0 || avgMs <= 0) return null;
  if (Math.abs(ms - avgMs) < avgMs * 0.1) return 'avg';
  return ms > avgMs ? 'above-avg' : 'below-avg';
}

const TIER_BADGE_CLASS: Record<PerformanceTier, string> = {
  max: 'badge-error',
  'above-avg': 'badge-warning',
  avg: 'badge-success',
  'below-avg': 'badge-info',
  min: 'badge-info',
};

function TracePropertyTable({ data }: { data: TraceProperty[] }) {
  return (
    <div class="overflow-x-auto">
      <table class="table table-sm w-full">
        <tbody>
          {data.map((p, i) => (
            <tr key={i} class="border-base-300/40">
              <td class="w-[200px] whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{p.Name}</td>
              <td class="break-all py-2 font-mono text-xs text-base-content">{p.Value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TraceTabProps {
  traceId: number | null;
  baseUrl: string;
}

function LoadingState({ label }: { label: string }) {
  return (
    <div class="flex items-center justify-center gap-2 py-6 text-sm text-base-content/60">
      <span class="animate-spin"><LoaderCircle size={16} /></span>
      {label}
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return <div class="alert alert-error text-sm">{tSub('traceFailedToLoad', error)}</div>;
}

function EmptyState({ label }: { label: string }) {
  return <div class="py-6 text-center text-sm text-base-content/50">{label}</div>;
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

  if (error) return <ErrorState error={error} />;
  if (data === null) return <LoadingState label={t('traceLoadingProperties')} />;
  if (data.length === 0) return <EmptyState label={t('traceNoExchangeProperties')} />;

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

  if (error) return <ErrorState error={error} />;
  if (data === null) return <LoadingState label={t('traceLoadingHeaders')} />;
  if (data.length === 0) return <EmptyState label={t('traceNoMessageHeaders')} />;

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

  if (error) return <ErrorState error={error} />;
  if (body === null) return <LoadingState label={t('traceLoadingBody')} />;
  if (body === '') return <EmptyState label={t('traceNoBodyContent')} />;

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

  if (error) return <ErrorState error={error} />;
  if (data === null) return <LoadingState label={t('traceLoadingLog')} />;
  if (data.length === 0) return <EmptyState label={t('traceNoLogProperties')} />;

  return <TracePropertyTable data={data} />;
}

function InfoTab({ element, avgDurationMs }: { element: InlineTraceElement; avgDurationMs: number }) {
  const tier = getDurationTier(element.durationMs, avgDurationMs);
  const badgeClass = tier ? TIER_BADGE_CLASS[tier] : 'badge-success';

  return (
    <div class="overflow-x-auto">
      <table class="table table-sm w-full">
        <tbody>
          <tr>
            <td colSpan={2} class="bg-base-200/60 px-0 py-3 text-[11px] font-bold uppercase tracking-wide text-base-content/50">{t('traceTiming')}</td>
          </tr>
          <tr class="border-base-300/40">
            <td class="w-[200px] whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{t('traceStart')}</td>
            <td class="break-all py-2 font-mono text-xs text-base-content">{formatDateTime(element.stepStart)}</td>
          </tr>
          <tr class="border-base-300/40">
            <td class="w-[200px] whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{t('traceStop')}</td>
            <td class="break-all py-2 font-mono text-xs text-base-content">{formatDateTime(element.stepStop)}</td>
          </tr>
          <tr class="border-base-300/40">
            <td class="w-[200px] whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{t('traceDuration')}</td>
            <td class="break-all py-2 font-mono text-xs text-base-content">
              <span class={`badge badge-sm ${badgeClass}`}>{formatDuration(element.durationMs)}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={2} class="bg-base-200/60 px-0 py-3 text-[11px] font-bold uppercase tracking-wide text-base-content/50">{t('traceIdentifiers')}</td>
          </tr>
          <tr class="border-base-300/40">
            <td class="w-[200px] whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{t('traceStepId')}</td>
            <td class="break-all py-2 font-mono text-xs text-base-content">{element.stepId}</td>
          </tr>
          <tr class="border-base-300/40">
            <td class="w-[200px] whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{t('traceModelStepId')}</td>
            <td class="break-all py-2 font-mono text-xs text-base-content">{element.modelStepId}</td>
          </tr>
          <tr class="border-base-300/40">
            <td class="w-[200px] whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{t('traceRunId')}</td>
            <td class="break-all py-2 font-mono text-xs text-base-content">{element.runId}</td>
          </tr>
          <tr class="border-base-300/40">
            <td class="w-[200px] whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{t('traceBranchId')}</td>
            <td class="break-all py-2 font-mono text-xs text-base-content">{element.branchId}</td>
          </tr>
          <tr class="border-base-300/40">
            <td class="w-[200px] whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{t('traceChildCount')}</td>
            <td class="break-all py-2 font-mono text-xs text-base-content">{element.childCount}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function TraceStepPopup({ element, allElements, baseUrl, onNavigate, onClose }: TraceStepPopupProps) {
  const [activeTab, setActiveTab] = useState<TabId>('properties');
  const [traceId, setTraceId] = useState<number | null>(null);

  const currentIndex = useMemo(
    () => allElements.findIndex(e => e.stepId === element.stepId),
    [allElements, element.stepId],
  );
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allElements.length - 1;

  const avgDurationMs = useMemo(() => {
    const durations = allElements.filter(e => e.durationMs > 0).map(e => e.durationMs);
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }, [allElements]);

  useEffect(() => {
    let cancelled = false;
    setTraceId(null);
    (async () => {
      try {
        const msgs = await fetchTraceMessages(baseUrl, element.runId, element.childCount);
        if (!cancelled && msgs.length > 0) {
          setTraceId(msgs[0]!.TraceId);
        }
      } catch (err) {
        devLog.error(LOG_TAG, 'Failed to fetch TraceId', { error: String(err) });
      }
    })();
    return () => { cancelled = true; };
  }, [baseUrl, element.runId, element.childCount]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest?.('.cm-editor') || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(allElements[currentIndex - 1]!);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(allElements[currentIndex + 1]!);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, onNavigate, hasPrev, hasNext, currentIndex, allElements]);

  const tabs: Array<{ id: TabId; label: string; show: boolean }> = [
    { id: 'properties', label: t('traceProperties'), show: true },
    { id: 'headers', label: t('traceHeaders'), show: true },
    { id: 'body', label: t('traceBody'), show: true },
    { id: 'log', label: t('traceLog'), show: true },
    { id: 'info', label: t('traceInfo'), show: true },
    { id: 'error', label: t('traceError'), show: !!element.error },
  ];

  return (
    <DockPanel
      header={
        <>
          <div class="flex items-center justify-between gap-4 border-b border-base-300 px-4 py-3">
            <div class="flex min-w-0 items-center gap-2">
              <span class={`h-2.5 w-2.5 shrink-0 rounded-full ${element.error ? 'bg-error' : 'bg-success'}`} />
              <span class="text-sm font-semibold text-base-content">{t('traceStep')}</span>
              <span class="truncate font-mono text-[11px] text-base-content/50">{element.modelStepId}</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1">
                <button
                  class="btn btn-ghost btn-sm btn-square"
                  title="Previous step (←)"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && onNavigate(allElements[currentIndex - 1]!)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span class="px-1 font-mono text-[11px] text-base-content/50">{currentIndex + 1}/{allElements.length}</span>
                <button
                  class="btn btn-ghost btn-sm btn-square"
                  title="Next step"
                  disabled={!hasNext}
                  onClick={() => hasNext && onNavigate(allElements[currentIndex + 1]!)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button class="btn btn-ghost btn-sm btn-square" onClick={onClose}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div class="tabs tabs-border border-b border-base-300 px-4 pt-2">
            {tabs.filter(tab => tab.show).map(tab => (
              <button
                key={tab.id}
                class={`tab ${activeTab === tab.id ? 'tab-active text-primary' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </>
      }
    >
      <div class="p-4">
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
            <div class="alert alert-error text-sm whitespace-pre-wrap break-all">{element.error}</div>
          </div>
        )}
      </div>
    </DockPanel>
  );
}
