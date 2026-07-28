import { useState, useRef, useEffect } from 'preact/hooks';
import { addTenant } from '@/features/settings/settings';
import { validateName, validateCpiUrl } from '@/features/settings/validators';
import { Check, X } from 'lucide-preact';
import { t } from '@/features/shared/i18n';

interface AddTenantFormProps {
  customerId: string;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export function AddTenantForm({ customerId, onSave, onCancel }: AddTenantFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [nameError, setNameError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  async function handleSave() {
    const nv = validateName(name.trim(), 'Tenant');
    const uv = validateCpiUrl(url.trim());
    setNameError(nv.valid ? '' : nv.error!);
    setUrlError(uv.valid ? '' : uv.error!);
    if (!nv.valid || !uv.valid) return;

    setSaving(true);
    try {
      await addTenant(customerId, name.trim(), url.trim());
      await onSave();
    } catch (err) {
      setNameError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="card card-border mb-4 border-info/40 bg-info/10 p-4">
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex min-w-[150px] flex-col gap-1">
          <label class="text-xs font-semibold text-base-content/70">{t('tenantName') || 'Tenant Name'}:</label>
          <input
            ref={nameRef}
            type="text"
            class={`input input-bordered input-sm w-full ${nameError ? 'input-error' : ''}`}
            placeholder="e.g. DEV, TEST, PROD"
            value={name}
            onInput={e => setName((e.target as HTMLInputElement).value)}
          />
          {nameError && <span class="text-xs text-error">{nameError}</span>}
        </div>
        <div class="flex min-w-[150px] flex-1 flex-col gap-1">
          <label class="text-xs font-semibold text-base-content/70">URL:</label>
          <input
            type="url"
            class={`input input-bordered input-sm w-full ${urlError ? 'input-error' : ''}`}
            placeholder="https://dev-tenant.integrationsuite..."
            value={url}
            onInput={e => setUrl((e.target as HTMLInputElement).value)}
          />
          {urlError && <span class="text-xs text-error">{urlError}</span>}
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
            title={t('save') || 'Save'}
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            onClick={onCancel}
            title={t('cancel') || 'Cancel'}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
