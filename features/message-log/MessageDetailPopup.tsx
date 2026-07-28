import { useState, useEffect, useCallback } from 'preact/hooks';
import { LoaderCircle, X, Copy } from 'lucide-preact';
import { t, tSub } from '@/features/shared/i18n';
import { showToast } from '@/features/shared/toast';
import { devLog } from '@/features/shared/dev-logger';
import { MPL_STATUS_COLORS } from '@/features/shared/constants';
import {
  fetchMessageDetail,
  fetchMessageStoreEntries,
  fetchMessageStoreEntryProperties,
  fetchMessageStoreEntryValue,
} from './MplApiClient';
import { parseODataDate } from './mpl-types';
import type { MessageProcessingLogDetail, MessageStoreEntry, MessageStoreProperty } from './mpl-types';
import './MessageDetailPopup.css';

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

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

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
    <table class="info-table">
      {rows.map((row, i) => {
        if (row.section) {
          return <tr key={i} class="section-row"><td colSpan={2}>{row.label}</td></tr>;
        }
        const statusColor = row.label === 'Status' ? MPL_STATUS_COLORS[row.value] : undefined;
        return (
          <tr key={i}>
            <td class="info-label">{row.label}</td>
            <td class="info-value">
              {statusColor ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: statusColor, boxShadow: `0 0 4px ${statusColor}80`,
                  }} />
                  {row.value}
                </span>
              ) : row.value}
            </td>
          </tr>
        );
      })}
    </table>
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
    return <div style={{ padding: '16px', textAlign: 'center', color: '#ef4444' }}>{tSub('msgDetailFailedToLoad', error)}</div>;
  }

  if (payload === null) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        <span class="flowmate-spin"><LoaderCircle size={16} /></span> {t('msgDetailLoading')}
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <div class="entry-section-label">{t('msgDetailPayload')}</div>
      <pre class="payload-pre">{payload || '(empty)'}</pre>
      {properties && properties.length > 0 && (
        <>
          <div class="entry-section-label" style={{ marginTop: '12px' }}>{t('msgDetailProperties')}</div>
          <table class="info-table">
            {properties.map((prop, i) => (
              <tr key={i}>
                <td class="info-label">{prop.Name}</td>
                <td class="info-value">{prop.Value}</td>
              </tr>
            ))}
          </table>
        </>
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
    return <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>{tSub('msgDetailFailedToLoad', error)}</div>;
  }

  if (entries === null) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
        <span class="flowmate-spin"><LoaderCircle size={16} /></span> {t('msgDetailLoading')}
      </div>
    );
  }

  if (entries.length === 0) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>{t('msgDetailNoPersist')}</div>;
  }

  return (
    <div>
      <div class="persist-sub-tab-bar">
        {entries.map((entry, i) => (
          <button
            key={entry.Id}
            class={`persist-sub-tab ${i === activeEntry ? 'persist-sub-tab--active' : ''}`}
            onClick={() => setActiveEntry(i)}
          >
            {entry.MessageStoreId}
          </button>
        ))}
      </div>
      <div style={{ padding: '0 4px' }}>
        <EntryContent
          key={entries[activeEntry].Id}
          entryId={entries[activeEntry].Id}
          baseUrl={baseUrl}
        />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------

interface MessageDetailPopupProps {
  guid: string;
  baseUrl: string;
  onClose: () => void;
}

export function MessageDetailPopup({ guid, baseUrl, onClose }: MessageDetailPopupProps) {
  const [detail, setDetail] = useState<MessageProcessingLogDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'persist'>('info');

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch detail
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

  const handleOverlayClick = useCallback((e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('detail-overlay')) {
      onClose();
    }
  }, [onClose]);

  function copyGuid() {
    if (detail) {
      navigator.clipboard.writeText(detail.MessageGuid);
      showToast('GUID copied to clipboard', 'success');
    }
  }

  // Loading state
  if (!detail && !error) {
    return (
      <div class="detail-overlay" onClick={handleOverlayClick}>
        <div class="detail-modal" onClick={(e) => e.stopPropagation()}>
          <div class="detail-header">
            <span class="detail-title"><span class="flowmate-spin"><LoaderCircle size={16} /></span> {t('msgDetailLoading')}</span>
            <button class="detail-icon-btn" onClick={onClose}><X size={16} /></button>
          </div>
          <div class="detail-body" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            <span class="flowmate-spin"><LoaderCircle size={16} /></span> {t('msgDetailLoading')}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div class="detail-overlay" onClick={handleOverlayClick}>
        <div class="detail-modal" onClick={(e) => e.stopPropagation()}>
          <div class="detail-header">
            <span class="detail-title">{t('msgDetailError')}</span>
            <button class="detail-icon-btn" onClick={onClose}><X size={16} /></button>
          </div>
          <div class="detail-body" style={{ padding: '32px', textAlign: 'center', color: '#ef4444' }}>
            {tSub('msgDetailFailedToLoad', error)}
          </div>
        </div>
      </div>
    );
  }

  const statusColor = MPL_STATUS_COLORS[detail!.Status] ?? '#6b7280';

  return (
    <div class="detail-overlay" onClick={handleOverlayClick}>
      <div class="detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div class="detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: statusColor, boxShadow: `0 0 6px ${statusColor}80`, flexShrink: 0,
            }} />
            <span class="detail-title">{t('msgDetailMessageDetail')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span class="detail-guid">{detail!.MessageGuid}</span>
            <button class="detail-icon-btn" title="Copy GUID" onClick={copyGuid}>
              <Copy size={16} />
            </button>
            <button class="detail-icon-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div class="detail-body">
          <div class="detail-tab-bar">
            <button
              class={`detail-tab ${activeTab === 'info' ? 'detail-tab--active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              {t('msgDetailInfo')}
            </button>
            <button
              class={`detail-tab ${activeTab === 'persist' ? 'detail-tab--active' : ''}`}
              onClick={() => setActiveTab('persist')}
            >
              {t('msgDetailPersist')}
            </button>
          </div>

          <div class="detail-tab-content">
            {activeTab === 'info' && <InfoTable detail={detail!} />}
            {activeTab === 'persist' && <PersistTab guid={guid} baseUrl={baseUrl} />}
          </div>
        </div>
      </div>
    </div>
  );
}
