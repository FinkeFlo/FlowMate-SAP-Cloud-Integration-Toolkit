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
    <div class={`tenant-item ${tenant.enabled ? 'enabled' : 'disabled'}`}>
      <div class="tenant-info">
        {editing ? (
          <div class="tenant-edit-form" style={{ display: 'block' }}>
            <div class="edit-form-group">
              <input
                ref={nameRef}
                type="text"
                class={`form-input-xs ${nameError ? 'form-input--error' : ''}`}
                value={editName}
                onInput={e => setEditName((e.target as HTMLInputElement).value)}
                placeholder={t('tenantName') || 'Tenant Name'}
              />
              {nameError && <span class="field-error">{nameError}</span>}
              <input
                type="url"
                class={`form-input-xs ${urlError ? 'form-input--error' : ''}`}
                value={editUrl}
                onInput={e => setEditUrl((e.target as HTMLInputElement).value)}
                placeholder="URL"
              />
              {urlError && <span class="field-error">{urlError}</span>}
            </div>
          </div>
        ) : (
          <label class="checkbox-label">
            <input
              type="checkbox"
              class="tenant-checkbox"
              checked={tenant.enabled}
              onChange={e => handleToggle((e.target as HTMLInputElement).checked)}
            />
            <div class="tenant-details">
              <strong>{tenant.name}</strong>
              <span class="tenant-url">{tenant.url}</span>
            </div>
          </label>
        )}
      </div>
      <div class="tenant-actions">
        {editing ? (
          <>
            <button
              type="button"
              class="btn-icon"
              onClick={handleSaveEdit}
              title={t('save') || 'Save'}
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              class="btn-icon"
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
              class="btn-icon"
              onClick={() => setEditing(true)}
              title={t('editTenant') || 'Edit tenant'}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              class="btn-icon"
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
