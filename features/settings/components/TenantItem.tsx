import { useState, useRef, useEffect } from 'preact/hooks';
import { updateTenant, deleteTenant, type Tenant } from '@/features/settings/settings';
import { validateName, validateCpiUrl } from '@/features/settings/validators';
import { Check, X, Pencil, Trash2 } from 'lucide-preact';
import { t } from '@/features/shared/i18n';
import { ConfirmDialog } from './ConfirmDialog';

interface TenantItemProps {
  customerId: string;
  tenant: Tenant;
  onRefresh: () => Promise<void>;
}

export function TenantItem({ customerId, tenant, onRefresh }: TenantItemProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(tenant.name);
  const [editUrl, setEditUrl] = useState(tenant.url);
  const [nameError, setNameError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) nameRef.current?.focus();
  }, [editing]);

  async function handleToggle(checked: boolean) {
    await updateTenant(customerId, tenant.id, { enabled: checked });
  }

  async function handleSaveEdit() {
    const nv = validateName(editName.trim(), 'Tenant');
    const uv = validateCpiUrl(editUrl.trim());
    setNameError(nv.valid ? '' : nv.error!);
    setUrlError(uv.valid ? '' : uv.error!);
    if (!nv.valid || !uv.valid) return;

    await updateTenant(customerId, tenant.id, { name: editName.trim(), url: editUrl.trim() });
    setEditing(false);
    await onRefresh();
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditName(tenant.name);
    setEditUrl(tenant.url);
    setNameError('');
    setUrlError('');
  }

  async function handleDelete() {
    await deleteTenant(customerId, tenant.id);
    await onRefresh();
  }

  return (
    <div class={`flex items-center justify-between rounded-field border border-base-300 bg-base-100 px-4 py-3 transition-colors hover:border-primary ${tenant.enabled ? '' : 'opacity-50'}`}>
      <div class="flex flex-1 flex-col gap-2">
        {editing ? (
          <div class="w-full pl-7">
            <div class="flex flex-col gap-2">
              <input
                ref={nameRef}
                type="text"
                class={`input input-bordered input-sm w-full ${nameError ? 'input-error' : ''}`}
                value={editName}
                onInput={e => setEditName((e.target as HTMLInputElement).value)}
                placeholder={t('tenantName') || 'Tenant Name'}
              />
              {nameError && <span class="text-xs text-error">{nameError}</span>}
              <input
                type="url"
                class={`input input-bordered input-sm w-full ${urlError ? 'input-error' : ''}`}
                value={editUrl}
                onInput={e => setEditUrl((e.target as HTMLInputElement).value)}
                placeholder="URL"
              />
              {urlError && <span class="text-xs text-error">{urlError}</span>}
            </div>
          </div>
        ) : (
          <label class="flex cursor-pointer items-center gap-2 font-semibold">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              checked={tenant.enabled}
              onChange={e => handleToggle((e.target as HTMLInputElement).checked)}
            />
            <div class="flex flex-col gap-0.5">
              <strong>{tenant.name}</strong>
              <span class="ml-0 text-sm text-base-content/60">{tenant.url}</span>
            </div>
          </label>
        )}
      </div>
      <div class="flex items-center gap-1">
        {editing ? (
          <>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              onClick={handleSaveEdit}
              title={t('save') || 'Save'}
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              onClick={handleCancelEdit}
              title={t('cancel') || 'Cancel'}
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              onClick={() => setEditing(true)}
              title={t('editTenant') || 'Edit tenant'}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              onClick={() => setConfirmDelete(true)}
              title={t('deleteTenant') || 'Delete tenant'}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`${t('confirmDeleteTenant') || 'Delete tenant'} "${tenant.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
