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
    <div class="form-inline">
      <div class="form-row">
        <div class="form-group-inline">
          <label>{t('tenantName') || 'Tenant Name'}:</label>
          <input
            ref={nameRef}
            type="text"
            class={`form-input-sm ${nameError ? 'form-input--error' : ''}`}
            placeholder="e.g. DEV, TEST, PROD"
            value={name}
            onInput={e => setName((e.target as HTMLInputElement).value)}
          />
          {nameError && <span class="field-error">{nameError}</span>}
        </div>
        <div class="form-group-inline flex-grow">
          <label>URL:</label>
          <input
            type="url"
            class={`form-input-sm ${urlError ? 'form-input--error' : ''}`}
            placeholder="https://dev-tenant.integrationsuite..."
            value={url}
            onInput={e => setUrl((e.target as HTMLInputElement).value)}
          />
          {urlError && <span class="field-error">{urlError}</span>}
        </div>
        <div class="form-actions-inline">
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
