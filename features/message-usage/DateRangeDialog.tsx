import { useState, useEffect, useCallback } from 'preact/hooks';
import { Download } from 'lucide-preact';
import { t } from '@/features/shared/i18n';
import { showToast } from '@/features/shared/toast';
import { getSettings, type Customer } from '@/features/settings/settings';
import './DateRangeDialog.css';

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

  // Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('date-dialog-overlay')) {
        onCancel();
      }
    },
    [onCancel],
  );

  function setQuickRange(monthsBack: number, toEndOfCurrent: boolean) {
    const today = new Date();
    if (toEndOfCurrent) {
      // Current month: 1st to last day
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

  return (
    <div class="date-dialog-overlay" onClick={handleOverlayClick}>
      <div class="date-dialog-modal">
        {/* Header */}
        <div class="date-dialog-header">
          <Download size={20} style={{ color: '#a5b4fc' }} />
          <h2 class="date-dialog-title">
            {t('exportMessageUsage') || 'Export Message Usage Data'}
          </h2>
        </div>

        {/* Export Mode */}
        <div class="date-dialog-section">
          <label class="date-dialog-label">
            {t('exportMode') || 'Export Mode'}
          </label>
          <div class="date-dialog-radio-group">
            <label class="date-dialog-radio-label">
              <input
                type="radio"
                name="export-mode"
                checked={exportMode === 'single'}
                onChange={() => setExportMode('single')}
              />
              <span>{t('currentTenantOnly') || 'Current Tenant Only'}</span>
            </label>
            <label
              class={`date-dialog-radio-label ${customers.length === 0 ? 'date-dialog-radio-label--disabled' : ''}`}
            >
              <input
                type="radio"
                name="export-mode"
                checked={exportMode === 'customer'}
                disabled={customers.length === 0}
                onChange={() => setExportMode('customer')}
              />
              <span>{t('allTenantsFromCustomer') || 'All Tenants from Customer'}</span>
            </label>
          </div>
        </div>

        {/* Customer Selection */}
        {exportMode === 'customer' && (
          <div class="date-dialog-section">
            <label class="date-dialog-label">
              {t('selectCustomer') || 'Select Customer'}
            </label>
            <select
              class="date-dialog-select"
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

        {/* Date Inputs */}
        <div class="date-dialog-section">
          <div class="date-dialog-date-row">
            <div>
              <label class="date-dialog-label">
                {t('startDate') || 'Start Date'}
              </label>
              <input
                type="date"
                class="date-dialog-input"
                value={startDate}
                onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label class="date-dialog-label">
                {t('endDate') || 'End Date'}
              </label>
              <input
                type="date"
                class="date-dialog-input"
                value={endDate}
                onChange={(e) => setEndDate((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
        </div>

        {/* Quick Select */}
        <div class="date-dialog-section">
          <label class="date-dialog-label">
            {t('quickSelect') || 'Quick Select'}
          </label>
          <div class="date-dialog-quick-row">
            <button
              type="button"
              class="date-dialog-quick-btn"
              onClick={() => setQuickRange(1, false)}
            >
              {t('lastMonth') || 'Last Month'}
            </button>
            <button
              type="button"
              class="date-dialog-quick-btn"
              onClick={() => setQuickRange(0, true)}
            >
              {t('currentMonth') || 'Current Month'}
            </button>
            <button
              type="button"
              class="date-dialog-quick-btn"
              onClick={() => setQuickRange(3, false)}
            >
              {t('last3Months') || 'Last 3 Months'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div class="date-dialog-actions">
          <button type="button" class="date-dialog-btn--cancel" onClick={onCancel}>
            {t('cancel') || 'Cancel'}
          </button>
          <button type="button" class="date-dialog-btn--export" onClick={handleSubmit}>
            {t('export') || 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
