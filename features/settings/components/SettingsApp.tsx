import { useState, useEffect, useCallback } from 'preact/hooks';
import { getSettings, addCustomer, type Settings } from '@/features/settings/settings';
import { Plus } from 'lucide-preact';
import { showToast } from '@/features/shared/toast';
import { t } from '@/features/shared/i18n';
import { ToastContainer } from '@/features/shared/ToastContainer';
import { CustomerCard } from './CustomerCard';
import { AddCustomerForm } from './AddCustomerForm';
import './SettingsApp.css';

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
    return <div class="settings-loading">{t('loading') || 'Loading...'}</div>;
  }

  return (
    <div class="container">
      <header>
        <h1>{t('settingsTitle') || 'FlowMate Settings'}</h1>
        <p>{t('settingsDescription') || 'Manage your Customers and CPI Tenants'}</p>
      </header>

      <div class="customers-section">
        <div class="section-header">
          <h2>{t('customersAndTenants') || 'Customers & Tenants'}</h2>
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

        <div class="customers-list">
          {settings.customers.length === 0 ? (
            <p class="empty-state">
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
