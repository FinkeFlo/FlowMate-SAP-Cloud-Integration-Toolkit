import { useState, useRef, useEffect } from 'preact/hooks';
import { updateCustomer, deleteCustomer, type Customer } from '@/features/settings/settings';
import { validateName } from '@/features/settings/validators';
import { Check, X, Pencil, Trash2, Plus } from 'lucide-preact';
import { t } from '@/features/shared/i18n';
import { TenantItem } from './TenantItem';
import { AddTenantForm } from './AddTenantForm';
import { ConfirmDialog } from './ConfirmDialog';

interface CustomerCardProps {
  customer: Customer;
  onRefresh: () => Promise<void>;
}

export function CustomerCard({ customer, onRefresh }: CustomerCardProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [nameError, setNameError] = useState('');
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSaveEdit() {
    const validation = validateName(editName.trim(), 'Customer');
    if (!validation.valid) {
      setNameError(validation.error!);
      return;
    }
    setNameError('');
    await updateCustomer(customer.id, { name: editName.trim() });
    setEditing(false);
    await onRefresh();
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditName(customer.name);
    setNameError('');
  }

  async function handleDelete() {
    await deleteCustomer(customer.id);
    await onRefresh();
  }

  async function handleTenantAdded() {
    setShowAddTenant(false);
    await onRefresh();
  }

  return (
    <div class="card card-border mb-6 border-base-300 bg-base-200 p-6">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex-1">
          {editing ? (
            <>
              <input
                ref={inputRef}
                type="text"
                class={`input input-bordered input-lg max-w-sm font-semibold text-primary ${nameError ? 'input-error' : ''}`}
                value={editName}
                onInput={e => setEditName((e.target as HTMLInputElement).value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
              />
              {nameError && <span class="mt-1 block text-xs text-error">{nameError}</span>}
            </>
          ) : (
            <h3 class="text-xl font-semibold text-primary">{customer.name}</h3>
          )}
        </div>
        <div class="flex items-center gap-2">
          {editing ? (
            <>
              <button type="button" class="btn btn-primary btn-sm" onClick={handleSaveEdit}>
                <Check size={16} /> {t('save') || 'Save'}
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
                <X size={16} /> {t('cancel') || 'Cancel'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                onClick={() => setEditing(true)}
              >
                <Pencil size={16} /> {t('edit') || 'Edit'}
              </button>
              <button
                type="button"
                class="btn btn-error btn-sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} /> {t('delete') || 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>

      {showAddTenant && (
        <AddTenantForm
          customerId={customer.id}
          onSave={handleTenantAdded}
          onCancel={() => setShowAddTenant(false)}
        />
      )}

      <div class="my-2 flex flex-col gap-2">
        {customer.tenants.length === 0 ? (
          <p class="py-4 text-center italic text-base-content/50">{t('noTenants') || 'No tenants created'}</p>
        ) : (
          customer.tenants.map(tenant => (
            <TenantItem
              key={tenant.id}
              customerId={customer.id}
              tenant={tenant}
              onRefresh={onRefresh}
            />
          ))
        )}
      </div>

      {!showAddTenant && (
        <button
          type="button"
          class="btn btn-secondary btn-sm w-fit"
          onClick={() => setShowAddTenant(true)}
        >
          <Plus size={16} /> {t('addTenant') || 'Add Tenant'}
        </button>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`${t('confirmDeleteCustomer') || 'Delete customer'} "${customer.name}" ${t('andAllTenants') || 'and all its tenants'}?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
