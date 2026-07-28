import { useState, useEffect, useCallback } from 'preact/hooks';
import { getSettings, addCustomer, type Settings } from '@/features/settings/settings';
import { Plus } from 'lucide-preact';
import { showToast } from '@/features/shared/toast';
import { t } from '@/features/shared/i18n';
import { ToastContainer } from '@/features/shared/ToastContainer';
import { CustomerCard } from './CustomerCard';
import { AddCustomerForm } from './AddCustomerForm';

export function SettingsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadSettings = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleAddCustomer(name: string) {
    await addCustomer(name);
    setShowAddForm(false);
    showToast(`${t('customerAdded') || 'Customer added'}: ${name}`, 'success');
    await loadSettings();
  }

  if (!settings) {
    return (
      <div class="flex min-h-[200px] items-center justify-center text-base-content/60">
        {t('loading') || 'Loading...'}
      </div>
    );
  }

  return (
    <div class="mx-auto max-w-5xl">
      <header class="card mb-8 bg-base-100 p-8 shadow">
        <h1 class="text-2xl font-bold text-primary">{t('settingsTitle') || 'FlowMate Settings'}</h1>
        <p class="text-base-content/60">{t('settingsDescription') || 'Manage your Customers and CPI Tenants'}</p>
      </header>

      <div class="card bg-base-100 p-8 shadow">
        <div class="mb-8 flex items-center justify-between border-b-2 border-base-200 pb-4">
          <h2 class="text-xl font-semibold">{t('customersAndTenants') || 'Customers & Tenants'}</h2>
          {!showAddForm && (
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} /> {t('addCustomer') || 'Add Customer'}
            </button>
          )}
        </div>

        {showAddForm && (
          <AddCustomerForm
            onSave={handleAddCustomer}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        <div class="flex flex-col gap-6">
          {settings.customers.length === 0 ? (
            <p class="py-8 text-center italic text-base-content/50">
              {t('noCustomers') || 'No customers created yet. Click "Add Customer".'}
            </p>
          ) : (
            settings.customers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onRefresh={loadSettings}
              />
            ))
          )}
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
