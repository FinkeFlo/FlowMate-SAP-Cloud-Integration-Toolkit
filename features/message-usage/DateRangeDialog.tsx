import { useState, useEffect, useCallback } from 'preact/hooks';
import { Download } from 'lucide-preact';
import { t } from '@/features/shared/i18n';
import { showToast } from '@/features/shared/toast';
import { getSettings, type Customer } from '@/features/settings/settings';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ExportOptions {
  dateRange: DateRange;
  exportMode: 'single' | 'customer';
  customerId?: string;
}

interface DateRangeDialogProps {
  onExport: (options: ExportOptions) => void;
  onCancel: () => void;
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDates() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const firstDayOfMonth = new Date(yesterday.getFullYear(), yesterday.getMonth(), 1);
  return {
    startDate: formatDateLocal(firstDayOfMonth),
    endDate: formatDateLocal(yesterday),
  };
}

export function DateRangeDialog({ onExport, onCancel }: DateRangeDialogProps) {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [exportMode, setExportMode] = useState<'single' | 'customer'>('single');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    getSettings().then(s => setCustomers(s.customers));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('modal')) {
        onCancel();
      }
    },
    [onCancel],
  );

  function setQuickRange(monthsBack: number, toEndOfCurrent: boolean) {
    const today = new Date();
    if (toEndOfCurrent) {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(formatDateLocal(first));
      setEndDate(formatDateLocal(last));
    } else {
      const first = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(formatDateLocal(first));
      setEndDate(formatDateLocal(last));
    }
  }

  function handleSubmit() {
    if (!startDate || !endDate) {
      showToast(t('selectBothDates') || 'Please select both dates', 'warning');
      return;
    }
    if (startDate > endDate) {
      showToast(t('startBeforeEnd') || 'Start date must be before end date', 'warning');
      return;
    }
    if (exportMode === 'customer' && !customerId) {
      showToast(t('selectCustomer') || 'Please select a customer', 'warning');
      return;
    }
    onExport({
      dateRange: { startDate, endDate },
      exportMode,
      customerId: exportMode === 'customer' ? customerId : undefined,
    });
  }

  const sectionLabelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wide text-base-content/60';

  return (
    <div class="modal modal-open" onClick={handleOverlayClick}>
      <div class="modal-box max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div class="mb-6 flex items-center gap-3">
          <div class="rounded-full bg-primary/10 p-2 text-primary">
            <Download size={20} />
          </div>
          <h2 class="text-lg font-semibold text-primary">
            {t('exportMessageUsage') || 'Export Message Usage Data'}
          </h2>
        </div>

        <div class="space-y-5">
          <div>
            <label class={sectionLabelClass}>{t('exportMode') || 'Export Mode'}</label>
            <div class="rounded-box border border-base-300 bg-base-200 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <label class="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="export-mode"
                    class="radio radio-primary radio-sm"
                    checked={exportMode === 'single'}
                    onChange={() => setExportMode('single')}
                  />
                  <span>{t('currentTenantOnly') || 'Current Tenant Only'}</span>
                </label>
                <label
                  class={`flex items-center gap-2 text-sm ${customers.length === 0 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                >
                  <input
                    type="radio"
                    name="export-mode"
                    class="radio radio-primary radio-sm"
                    checked={exportMode === 'customer'}
                    disabled={customers.length === 0}
                    onChange={() => setExportMode('customer')}
                  />
                  <span>{t('allTenantsFromCustomer') || 'All Tenants from Customer'}</span>
                </label>
              </div>
            </div>
          </div>

          {exportMode === 'customer' && (
            <div>
              <label class={sectionLabelClass}>{t('selectCustomer') || 'Select Customer'}</label>
              <select
                class="select select-bordered w-full"
                value={customerId}
                onChange={(e) => setCustomerId((e.target as HTMLSelectElement).value)}
              >
                <option value="">-- {t('selectCustomer') || 'Select Customer'} --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.tenants.length} tenant{c.tenants.length !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class={sectionLabelClass}>{t('startDate') || 'Start Date'}</label>
                <input
                  type="date"
                  class="input input-bordered w-full"
                  value={startDate}
                  onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label class={sectionLabelClass}>{t('endDate') || 'End Date'}</label>
                <input
                  type="date"
                  class="input input-bordered w-full"
                  value={endDate}
                  onChange={(e) => setEndDate((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label class={sectionLabelClass}>{t('quickSelect') || 'Quick Select'}</label>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="btn btn-outline btn-sm"
                onClick={() => setQuickRange(1, false)}
              >
                {t('lastMonth') || 'Last Month'}
              </button>
              <button
                type="button"
                class="btn btn-outline btn-sm"
                onClick={() => setQuickRange(0, true)}
              >
                {t('currentMonth') || 'Current Month'}
              </button>
              <button
                type="button"
                class="btn btn-outline btn-sm"
                onClick={() => setQuickRange(3, false)}
              >
                {t('last3Months') || 'Last 3 Months'}
              </button>
            </div>
          </div>
        </div>

        <div class="modal-action mt-6">
          <button type="button" class="btn btn-secondary" onClick={onCancel}>
            {t('cancel') || 'Cancel'}
          </button>
          <button type="button" class="btn btn-primary" onClick={handleSubmit}>
            {t('export') || 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
