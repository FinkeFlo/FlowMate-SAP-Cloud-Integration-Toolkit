import { useState, useEffect } from 'preact/hooks';
import { LoaderCircle, X, Copy } from 'lucide-preact';
import { t, tSub } from '@/features/shared/i18n';
import { showToast } from '@/features/shared/toast';
import { devLog } from '@/features/shared/dev-logger';
import { MPL_STATUS_COLORS } from '@/features/shared/constants';
import { DockPanel } from '@/features/shared/DockPanel';
import { CodeViewer } from '@/features/shared/CodeViewer';
import {
  fetchMessageDetail,
  fetchMessageStoreEntries,
  fetchMessageStoreEntryProperties,
  fetchMessageStoreEntryValue,
} from './MplApiClient';
import { parseODataDate } from './mpl-types';
import type { MessageProcessingLogDetail, MessageStoreEntry, MessageStoreProperty } from './mpl-types';

const LOG_TAG = 'MessageDetail';

function formatDateTime(date: Date): string {
  return date.toLocaleString('de-DE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDuration(startStr: string, endStr: string): string {
  const start = parseODataDate(startStr);
  const end = parseODataDate(endStr);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 1000) return `${diffMs}ms`;
  if (diffMs < 60_000) return `${(diffMs / 1000).toFixed(1)}s`;
  const mins = Math.floor(diffMs / 60_000);
  const secs = Math.floor((diffMs % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function InfoTable({ detail }: { detail: MessageProcessingLogDetail }) {
  type Row = { label: string; value: string; section?: boolean };

  const rows: Row[] = [
    { label: 'General', value: '', section: true },
    { label: 'MessageGuid', value: detail.MessageGuid },
    { label: 'CorrelationId', value: detail.CorrelationId || '-' },
    { label: 'ApplicationMessageId', value: detail.ApplicationMessageId || '-' },
    { label: 'Sender', value: detail.Sender || '-' },
    { label: 'Receiver', value: detail.Receiver || '-' },
    { label: 'IntegrationFlow', value: detail.IntegrationFlowName || '-' },
    { label: 'Timing', value: '', section: true },
    { label: 'Start', value: detail.LogStart ? formatDateTime(parseODataDate(detail.LogStart)) : '-' },
    { label: 'End', value: detail.LogEnd ? formatDateTime(parseODataDate(detail.LogEnd)) : '-' },
    { label: 'Duration', value: detail.LogStart && detail.LogEnd ? formatDuration(detail.LogStart, detail.LogEnd) : '-' },
    { label: 'Status', value: '', section: true },
    { label: 'Status', value: detail.Status },
    { label: 'LogLevel', value: detail.LogLevel || '-' },
    { label: 'CustomStatus', value: detail.CustomStatus || '-' },
    { label: 'TransactionId', value: detail.TransactionId || '-' },
  ];

  const customHeaders = detail.CustomHeaderProperties?.results ?? [];
  if (customHeaders.length > 0) {
    rows.push({ label: 'Custom Headers', value: '', section: true });
    for (const h of customHeaders) {
      rows.push({ label: h.Name, value: h.Value });
    }
  }

  return (
    <div class="overflow-x-auto">
      <table class="table table-sm w-full">
        <tbody>
          {rows.map((row, i) => {
            if (row.section) {
              return (
                <tr key={i}>
                  <td colSpan={2} class="bg-base-200/60 px-0 py-3 text-[11px] font-bold uppercase tracking-wide text-base-content/50">
                    {row.label}
                  </td>
                </tr>
              );
            }
            const statusColor = row.label === 'Status' ? MPL_STATUS_COLORS[row.value] : undefined;
            return (
              <tr key={i} class="border-base-300/40">
                <td class="w-44 whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{row.label}</td>
                <td class="break-all py-2 font-mono text-xs text-base-content">
                  {statusColor ? (
                    <span class="inline-flex items-center gap-2">
                      <span
                        class="h-2 w-2 rounded-full"
                        style={{ background: statusColor, boxShadow: `0 0 4px ${statusColor}80` }}
                      />
                      {row.value}
                    </span>
                  ) : row.value}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface EntryContentProps {
  entryId: string;
  baseUrl: string;
}

function EntryContent({ entryId, baseUrl }: EntryContentProps) {
  const [payload, setPayload] = useState<string | null>(null);
  const [properties, setProperties] = useState<MessageStoreProperty[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, props] = await Promise.all([
          fetchMessageStoreEntryValue(baseUrl, entryId),
          fetchMessageStoreEntryProperties(baseUrl, entryId),
        ]);
        if (!cancelled) {
          setPayload(p);
          setProperties(props);
        }
      } catch (err) {
        devLog.error(LOG_TAG, 'Failed to load entry content', { error: String(err), entryId });
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [entryId, baseUrl]);

  if (error) {
    return <div class="alert alert-error text-sm">{tSub('msgDetailFailedToLoad', error)}</div>;
  }

  if (payload === null) {
    return (
      <div class="flex items-center justify-center gap-2 py-6 text-sm text-base-content/60">
        <span class="animate-spin"><LoaderCircle size={16} /></span>
        {t('msgDetailLoading')}
      </div>
    );
  }

  return (
    <div class="space-y-4 py-1">
      <div>
        <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-base-content/50">{t('msgDetailPayload')}</div>
        {payload ? <CodeViewer content={payload} maxHeight="400px" /> : <div class="py-2 text-sm text-base-content/50">(empty)</div>}
      </div>
      {properties && properties.length > 0 && (
        <div>
          <div class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-base-content/50">{t('msgDetailProperties')}</div>
          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <tbody>
                {properties.map((prop, i) => (
                  <tr key={i} class="border-base-300/40">
                    <td class="w-44 whitespace-nowrap py-2 pr-3 align-top text-xs text-base-content/60">{prop.Name}</td>
                    <td class="break-all py-2 font-mono text-xs text-base-content">{prop.Value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface PersistTabProps {
  guid: string;
  baseUrl: string;
}

function PersistTab({ guid, baseUrl }: PersistTabProps) {
  const [entries, setEntries] = useState<MessageStoreEntry[] | null>(null);
  const [activeEntry, setActiveEntry] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMessageStoreEntries(baseUrl, guid);
        data.sort((a, b) => a.MessageStoreId.localeCompare(b.MessageStoreId));
        if (!cancelled) setEntries(data);
      } catch (err) {
        devLog.error(LOG_TAG, 'Failed to load persist data', { error: String(err) });
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [guid, baseUrl]);

  if (error) {
    return <div class="alert alert-error text-sm">{tSub('msgDetailFailedToLoad', error)}</div>;
  }

  if (entries === null) {
    return (
      <div class="flex items-center justify-center gap-2 py-8 text-sm text-base-content/60">
        <span class="animate-spin"><LoaderCircle size={16} /></span>
        {t('msgDetailLoading')}
      </div>
    );
  }

  if (entries.length === 0) {
    return <div class="py-8 text-center text-sm text-base-content/50">{t('msgDetailNoPersist')}</div>;
  }

  return (
    <div>
      <div class="tabs tabs-border mb-3 overflow-x-auto">
        {entries.map((entry, i) => (
          <button
            key={entry.Id}
            class={`tab font-mono text-xs ${i === activeEntry ? 'tab-active text-primary' : ''}`}
            onClick={() => setActiveEntry(i)}
          >
            {entry.MessageStoreId}
          </button>
        ))}
      </div>
      <EntryContent
        key={entries[activeEntry]!.Id}
        entryId={entries[activeEntry]!.Id}
        baseUrl={baseUrl}
      />
    </div>
  );
}

interface MessageDetailPopupProps {
  guid: string;
  baseUrl: string;
  onClose: () => void;
}

export function MessageDetailPopup({ guid, baseUrl, onClose }: MessageDetailPopupProps) {
  const [detail, setDetail] = useState<MessageProcessingLogDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'persist'>('info');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchMessageDetail(baseUrl, guid);
        if (!cancelled) setDetail(data);
      } catch (err) {
        devLog.error(LOG_TAG, 'Failed to load message detail', { error: String(err) });
        if (!cancelled) setError(String(err));
      }
    })();
    return () => { cancelled = true; };
  }, [guid, baseUrl]);

  function copyGuid() {
    if (detail) {
      navigator.clipboard.writeText(detail.MessageGuid);
      showToast('GUID copied to clipboard', 'success');
    }
  }

  if (!detail && !error) {
    return (
      <DockPanel
        header={
          <div class="flex items-center justify-between gap-4 border-b border-base-300 px-4 py-3">
            <span class="flex items-center gap-2 text-sm font-semibold text-base-content">
              <span class="animate-spin"><LoaderCircle size={16} /></span>
              {t('msgDetailLoading')}
            </span>
            <button class="btn btn-ghost btn-sm btn-square" onClick={onClose}><X size={16} /></button>
          </div>
        }
      >
        <div class="flex items-center justify-center gap-2 px-6 py-10 text-sm text-base-content/60">
          <span class="animate-spin"><LoaderCircle size={16} /></span>
          {t('msgDetailLoading')}
        </div>
      </DockPanel>
    );
  }

  if (error) {
    return (
      <DockPanel
        header={
          <div class="flex items-center justify-between gap-4 border-b border-base-300 px-4 py-3">
            <span class="text-sm font-semibold text-base-content">{t('msgDetailError')}</span>
            <button class="btn btn-ghost btn-sm btn-square" onClick={onClose}><X size={16} /></button>
          </div>
        }
      >
        <div class="p-6">
          <div class="alert alert-error text-sm">{tSub('msgDetailFailedToLoad', error)}</div>
        </div>
      </DockPanel>
    );
  }

  const statusColor = MPL_STATUS_COLORS[detail!.Status] ?? '#6b7280';

  return (
    <DockPanel
      header={
        <>
          <div class="flex items-center justify-between gap-4 border-b border-base-300 px-4 py-3">
            <div class="flex min-w-0 items-center gap-2">
              <span
                class="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}80` }}
              />
              <span class="text-sm font-semibold text-base-content">{t('msgDetailMessageDetail')}</span>
            </div>
            <div class="flex min-w-0 items-center gap-2">
              <span class="truncate font-mono text-[11px] text-base-content/50">{detail!.MessageGuid}</span>
              <button class="btn btn-ghost btn-sm btn-square" title="Copy GUID" onClick={copyGuid}>
                <Copy size={16} />
              </button>
              <button class="btn btn-ghost btn-sm btn-square" onClick={onClose}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div class="tabs tabs-border border-b border-base-300 px-4 pt-2">
            <button
              class={`tab ${activeTab === 'info' ? 'tab-active text-primary' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              {t('msgDetailInfo')}
            </button>
            <button
              class={`tab ${activeTab === 'persist' ? 'tab-active text-primary' : ''}`}
              onClick={() => setActiveTab('persist')}
            >
              {t('msgDetailPersist')}
            </button>
          </div>
        </>
      }
    >
      <div class="p-4">
        {activeTab === 'info' && <InfoTable detail={detail!} />}
        {activeTab === 'persist' && <PersistTab guid={guid} baseUrl={baseUrl} />}
      </div>
    </DockPanel>
  );
}
