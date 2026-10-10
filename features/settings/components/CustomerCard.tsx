import { useState, useRef, useEffect } from 'preact/hooks';
import { updateCustomer, deleteCustomer, type Customer } from '@/features/settings/settings';
import { validateName } from '@/features/settings/validators';
import { Check, X, Pencil, Trash2, Plus } from 'lucide-preact';
import { t, tSub } from '@/features/shared/i18n';
import { TenantItem } from './TenantItem';
import { AddTenantForm } from './AddTenantForm';
import { ConfirmDialog } from '@/features/shared/ConfirmDialog';

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
    <div class="card card-border border-base-300 bg-base-100">
      <div class="flex items-center justify-between gap-3 border-b border-base-300 py-3 pr-3 pl-4">
        <div class="flex min-w-0 flex-1 items-center gap-2">
          {editing ? (
            <div class="flex w-full max-w-sm flex-col">
              <input
                ref={inputRef}
                type="text"
                class={`input input-bordered max-w-sm font-semibold ${nameError ? 'input-error' : ''}`}
                value={editName}
                onInput={e => setEditName((e.target as HTMLInputElement).value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
              />
              {nameError && <span class="mt-1 block text-xs text-error">{nameError}</span>}
            </div>
          ) : (
            <>
              <h3 class="truncate text-lg font-bold tracking-tight">{customer.name}</h3>
              <span class="badge badge-ghost badge-sm font-mono">{customer.tenants.length}</span>
            </>
          )}
        </div>
        <div class="flex shrink-0 items-center gap-1">
          {editing ? (
            <>
              <button type="button" class="btn btn-primary btn-sm" onClick={handleSaveEdit}>
                <Check size={16} /> {t('save')}
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
                <X size={16} /> {t('cancel')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square"
                title={t('edit')}
                aria-label={t('edit')}
                onClick={() => setEditing(true)}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-square"
                title={t('delete')}
                aria-label={t('delete')}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {showAddTenant && (
        <div class="px-4 pt-3">
          <AddTenantForm
            customerId={customer.id}
            onSave={handleTenantAdded}
            onCancel={() => setShowAddTenant(false)}
          />
        </div>
      )}

      <div class="flex flex-col divide-y divide-base-300">
        {customer.tenants.length === 0 ? (
          <p class="py-6 text-center text-sm text-muted">{t('noTenantsYet')}</p>
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
        <div class="border-t border-base-300 px-4 py-3">
          <button
            type="button"
            class="btn btn-soft btn-primary btn-xs"
            onClick={() => setShowAddTenant(true)}
          >
            <Plus size={14} /> {t('addTenant')}
          </button>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={tSub('confirmDeleteCustomerTitle', customer.name)}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
