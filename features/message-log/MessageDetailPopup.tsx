import { useState, useEffect } from 'preact/hooks';
import { LoaderCircle, X, Copy } from 'lucide-preact';
import { t, tSub } from '@/features/shared/i18n';
import { showToast } from '@/features/shared/toast';
import { devLog } from '@/features/shared/dev-logger';
import { mplStatusTone, TONE_BADGE_CLASS, TONE_DISC_CLASS } from '@/features/shared/status-tone';
import { DockPanel } from '@/features/shared/DockPanel';
import { CodeViewer } from '@/features/shared/CodeViewer';
import { formatDateTime, formatDuration } from '@/features/shared/time-format';
import {
  fetchMessageDetail,
  fetchMessageStoreEntries,
  fetchMessageStoreEntryProperties,
  fetchMessageStoreEntryValue,
} from './MplApiClient';
import { parseODataDate } from './mpl-types';
import type { MessageProcessingLogDetail, MessageStoreEntry, MessageStoreProperty } from './mpl-types';

const LOG_TAG = 'MessageDetail';

function formatElapsed(startStr: string, endStr: string): string {
  return formatDuration(parseODataDate(endStr).getTime() - parseODataDate(startStr).getTime());
}

function InfoTable({ detail }: { detail: MessageProcessingLogDetail }) {
  // Field labels are SAP's OData property names (technical, not translated);
  // section headings and plain-word labels go through i18n.
  type Row = { label: string; value: string; section?: boolean; status?: boolean };

  const rows: Row[] = [
    { label: t('msgDetailGeneral'), value: '', section: true },
    { label: 'MessageGuid', value: detail.MessageGuid },
    { label: 'CorrelationId', value: detail.CorrelationId || '-' },
    { label: 'ApplicationMessageId', value: detail.ApplicationMessageId || '-' },
    { label: 'Sender', value: detail.Sender || '-' },
    { label: 'Receiver', value: detail.Receiver || '-' },
    { label: 'IntegrationFlow', value: detail.IntegrationFlowName || '-' },
    { label: t('msgDetailTiming'), value: '', section: true },
    { label: t('msgDetailStart'), value: detail.LogStart ? formatDateTime(parseODataDate(detail.LogStart)) : '-' },
    { label: t('msgDetailEnd'), value: detail.LogEnd ? formatDateTime(parseODataDate(detail.LogEnd)) : '-' },
    { label: t('msgDetailDuration'), value: detail.LogStart && detail.LogEnd ? formatElapsed(detail.LogStart, detail.LogEnd) : '-' },
    { label: t('msgDetailStatus'), value: '', section: true },
    { label: 'Status', value: detail.Status, status: true },
    { label: 'LogLevel', value: detail.LogLevel || '-' },
    { label: 'CustomStatus', value: detail.CustomStatus || '-' },
    { label: 'TransactionId', value: detail.TransactionId || '-' },
  ];

  const customHeaders = detail.CustomHeaderProperties?.results ?? [];
  if (customHeaders.length > 0) {
    rows.push({ label: t('msgDetailCustomHeaders'), value: '', section: true });
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
                  <td colSpan={2} class="px-0 pt-4 pb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-muted">
                    {row.label}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={i} class="border-base-300/40">
                <td class="w-44 whitespace-nowrap py-2 pr-3 align-top font-mono text-xs text-muted">{row.label}</td>
                <td class="break-all py-2 font-mono text-xs text-base-content">
                  {row.status ? (
                    <span class="inline-flex items-center gap-2">
                      <span class={`size-2 rounded-full ${TONE_DISC_CLASS[mplStatusTone(row.value)]}`} />
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
    return <div class="alert alert-error alert-soft text-sm">{tSub('msgDetailFailedToLoad', error)}</div>;
  }

  if (payload === null) {
    return (
      <div class="flex items-center justify-center gap-2 py-6 text-sm text-muted">
        <span class="animate-spin"><LoaderCircle size={16} /></span>
        {t('msgDetailLoading')}
      </div>
    );
  }

  return (
    <div class="space-y-4 py-1">
      <div>
        <div class="mb-2 text-[11px] font-bold uppercase tracking-[0.07em] text-muted">{t('msgDetailPayload')}</div>
        {payload ? <CodeViewer content={payload} maxHeight="400px" /> : <div class="py-2 text-sm text-muted">{t('msgDetailEmptyPayload')}</div>}
      </div>
      {properties && properties.length > 0 && (
        <div>
          <div class="mb-2 text-[11px] font-bold uppercase tracking-[0.07em] text-muted">{t('msgDetailProperties')}</div>
          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <tbody>
                {properties.map((prop, i) => (
                  <tr key={i} class="border-base-300/40">
                    <td class="w-44 whitespace-nowrap py-2 pr-3 align-top font-mono text-xs text-muted">{prop.Name}</td>
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
    return <div class="alert alert-error alert-soft text-sm">{tSub('msgDetailFailedToLoad', error)}</div>;
  }

  if (entries === null) {
    return (
      <div class="flex items-center justify-center gap-2 py-8 text-sm text-muted">
        <span class="animate-spin"><LoaderCircle size={16} /></span>
        {t('msgDetailLoading')}
      </div>
    );
  }

  if (entries.length === 0) {
    return <div class="py-8 text-center text-sm text-muted">{t('msgDetailNoPersist')}</div>;
  }

  return (
    <div>
      <div role="tablist" class="tabs tabs-box tabs-sm mb-3 w-fit max-w-full flex-nowrap overflow-x-auto">
        {entries.map((entry, i) => (
          <button
            key={entry.Id}
            role="tab"
            aria-selected={i === activeEntry}
            class={`tab font-mono text-xs ${i === activeEntry ? 'tab-active' : ''}`}
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
      showToast(t('msgDetailGuidCopied'), 'success');
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
            <button class="btn btn-ghost btn-sm btn-square" aria-label={t('close')} onClick={onClose}><X size={16} /></button>
          </div>
        }
      >
        <div class="flex items-center justify-center gap-2 px-6 py-10 text-sm text-muted">
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
            <button class="btn btn-ghost btn-sm btn-square" aria-label={t('close')} onClick={onClose}><X size={16} /></button>
          </div>
        }
      >
        <div class="p-6">
          <div class="alert alert-error alert-soft text-sm">{tSub('msgDetailFailedToLoad', error)}</div>
        </div>
      </DockPanel>
    );
  }

  const tone = mplStatusTone(detail!.Status);

  return (
    <DockPanel
      header={
        <>
          <div class="flex items-center justify-between gap-4 px-4 pt-1 pb-2">
            <div class="flex min-w-0 items-center gap-2">
              <span class="text-sm font-bold text-base-content">{t('msgDetailMessageDetail')}</span>
              <span class={`badge badge-soft badge-sm ${TONE_BADGE_CLASS[tone]}`}>{detail!.Status}</span>
            </div>
            <div class="flex min-w-0 items-center gap-1">
              <span class="truncate font-mono text-xs text-muted">{detail!.MessageGuid}</span>
              <button class="btn btn-ghost btn-sm btn-square" title={t('msgDetailCopyGuid')} aria-label={t('msgDetailCopyGuid')} onClick={copyGuid}>
                <Copy size={16} />
              </button>
              <button class="btn btn-ghost btn-sm btn-square" aria-label={t('close')} onClick={onClose}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div class="border-b border-base-300 px-4 pb-3">
            <div role="tablist" class="tabs tabs-box tabs-sm w-fit">
              <button
                role="tab"
                aria-selected={activeTab === 'info'}
                class={`tab ${activeTab === 'info' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                {t('msgDetailInfo')}
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'persist'}
                class={`tab ${activeTab === 'persist' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('persist')}
              >
                {t('msgDetailPersist')}
              </button>
            </div>
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
