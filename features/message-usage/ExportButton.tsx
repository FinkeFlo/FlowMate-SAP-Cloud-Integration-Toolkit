import { useState, useRef, useEffect } from 'preact/hooks';
import { X, Download } from 'lucide-preact';
import { t } from '@/features/shared/i18n';
import { showToast } from '@/features/shared/toast';
import { MSG_OPEN_TENANT_TABS, sendTypedMessage } from '@/features/shared/messages';
import { ProgressBar } from './ProgressBar';
import { DateRangeDialog, type ExportOptions } from './DateRangeDialog';

async function ensureMultipleTenantSessions(tenantUrls: string[]): Promise<void> {
  await sendTypedMessage({
    type: MSG_OPEN_TENANT_TABS,
    urls: tenantUrls,
  });
}

export function ExportButton() {
  const [showDialog, setShowDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  function cancelExport() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  async function handleExport(options: ExportOptions) {
    setShowDialog(false);

    const { dateRange, exportMode, customerId } = options;
    const { startDate, endDate } = dateRange;

    const controller = new AbortController();
    abortRef.current = controller;
    setExporting(true);
    setProgress({ current: 0, total: 0 });

    try {
      if (exportMode === 'single') {
        await exportSingleTenant(startDate, endDate, controller.signal);
      } else if (exportMode === 'customer' && customerId) {
        await exportAllTenantsForCustomer(customerId, startDate, endDate, controller.signal);
      }

      if (controller.signal.aborted) {
        showToast(t('exportCancelled') || 'Export cancelled', 'warning');
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        showToast(
          `${t('exportFailed') || 'Export failed'}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error',
        );
      } else {
        showToast(t('exportCancelled') || 'Export cancelled', 'warning');
      }
    } finally {
      if (mountedRef.current) {
        setExporting(false);
        setProgressText('');
        setProgress({ current: 0, total: 0 });
      }
      abortRef.current = null;
    }
  }

  async function exportSingleTenant(startDate: string, endDate: string, signal: AbortSignal) {
    const { CPIApiClient } = await import('@/features/shared/api-client');
    const { CSVExporter } = await import('./csv-exporter');

    const client = new CPIApiClient();
    const exporter = new CSVExporter();

    const { data, failedDates } = await client.fetchAllData(
      startDate,
      endDate,
      (current, total) => {
        if (!mountedRef.current) return;
        setProgressText(`${t('cancelExport') || 'Cancel'} (${current}/${total})`);
        setProgress({ current, total });
      },
      signal,
    );

    if (signal.aborted) return;

    exporter.export(data, startDate, endDate);

    if (failedDates.length > 0) {
      showToast(
        `${t('exportIncompleteDates') || 'Could not fetch some dates'}: ${failedDates.join(', ')}`,
        'warning',
      );
    }
  }

  async function exportAllTenantsForCustomer(
    customerId: string,
    startDate: string,
    endDate: string,
    signal: AbortSignal,
  ) {
    const { getSettings } = await import('@/features/settings/settings');
    const { CPIApiClient } = await import('@/features/shared/api-client');
    const { CSVExporter } = await import('./csv-exporter');

    const settings = await getSettings();
    const customer = settings.customers.find(c => c.id === customerId);

    if (!customer || customer.tenants.length === 0) {
      showToast(t('noTenantsForCustomer') || 'No tenants found for this customer', 'warning');
      return;
    }

    const exporter = new CSVExporter();
    let totalSuccess = 0;
    const failedTenants: string[] = [];

    if (mountedRef.current) setProgressText(t('cancelExport') || 'Cancel');
    const tenantUrls = customer.tenants.map(tenant => `${tenant.url}/shell/home`);
    await ensureMultipleTenantSessions(tenantUrls);

    for (let i = 0; i < customer.tenants.length; i++) {
      if (signal.aborted) break;

      const tenant = customer.tenants[i]!;
      if (mountedRef.current) {
        setProgressText(
          `${t('cancelExport') || 'Cancel'} - ${tenant.name} (${i + 1}/${customer.tenants.length})`,
        );
      }

      try {
        const client = new CPIApiClient(tenant.url);
        const { data, failedDates } = await client.fetchAllData(
          startDate,
          endDate,
          (current, total) => {
            if (!mountedRef.current) return;
            setProgress({
              current: i * 100 + Math.round((current / total) * 100),
              total: customer.tenants.length * 100,
            });
          },
          signal,
        );

        if (signal.aborted) break;

        const tenantHostname = new URL(tenant.url).hostname;
        exporter.export(data, startDate, endDate, `${customer.name}_${tenant.name}`, tenantHostname);
        totalSuccess++;

        if (failedDates.length > 0) {
          showToast(`${tenant.name}: ${failedDates.length} dates failed`, 'warning');
        }
      } catch (error) {
        console.error(`Export failed for tenant ${tenant.name}:`, error);
        failedTenants.push(tenant.name);
      }

      if (i < customer.tenants.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!signal.aborted) {
      if (failedTenants.length > 0) {
        showToast(`${t('exportFailed') || 'Export failed'}: ${failedTenants.join(', ')}`, 'error');
      }
      if (totalSuccess > 0) {
        showToast(`${totalSuccess} tenant(s) exported`, 'success');
      }
    }
  }

  return (
    <>
      <div class="fixed top-[60px] right-5 z-[999999] flex flex-col items-end gap-1.5">
        {exporting ? (
          <>
            <button
              type="button"
              class="btn btn-error gap-2 shadow-lg"
              onClick={cancelExport}
            >
              <X size={16} />
              <span>{progressText || t('cancelExport') || 'Cancel'}</span>
            </button>
            <ProgressBar current={progress.current} total={progress.total} />
          </>
        ) : (
          <button
            type="button"
            class="btn btn-primary gap-2 shadow-lg"
            onClick={() => setShowDialog(true)}
          >
            <Download size={16} />
            <span>{t('exportData') || 'Export Data'}</span>
          </button>
        )}
      </div>

      {showDialog && (
        <DateRangeDialog
          onExport={handleExport}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
