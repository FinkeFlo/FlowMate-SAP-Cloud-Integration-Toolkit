import { useState, useEffect, useCallback } from 'preact/hooks';
import { getSettings, addCustomer, type Settings } from '@/features/settings/settings';
import { Plus } from 'lucide-preact';
import { showToast } from '@/features/shared/toast';
import { t, tSub } from '@/features/shared/i18n';
import { ToastContainer } from '@/features/shared/ToastContainer';
import { CustomerCard } from './CustomerCard';
import { AddCustomerForm } from './AddCustomerForm';
import { PreferencesCard } from './PreferencesCard';
import { FlowMateLogo } from '@/features/shared/FlowMateLogo';

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
    showToast(tSub('customerAdded', name), 'success');
    await loadSettings();
  }

  if (!settings) {
    return (
      <div class="flex min-h-[200px] items-center justify-center text-muted">
        {t('loading')}
      </div>
    );
  }

  return (
    <div class="mx-auto max-w-3xl px-4 py-10">
      <header class="mb-8 flex items-center gap-4">
        <FlowMateLogo size={44} />
        <div>
          <h1 class="text-[32px] font-extrabold leading-9 tracking-[-0.03em]">{t('settingsTitle')}</h1>
          <p class="text-sm text-muted">{t('manageYourTenants')}</p>
        </div>
      </header>

      <PreferencesCard />

      <div class="card card-border border-base-300 bg-base-100 p-6">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-lg font-bold tracking-tight">{t('customersAndTenants')}</h2>
          {!showAddForm && (
            <button
              type="button"
              class="btn btn-primary btn-sm"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} /> {t('addCustomer')}
            </button>
          )}
        </div>

        {showAddForm && (
          <AddCustomerForm
            onSave={handleAddCustomer}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        <div class="flex flex-col gap-4">
          {settings.customers.length === 0 ? (
            <p class="py-8 text-center text-sm text-muted">
              {t('noCustomersYet')}
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
