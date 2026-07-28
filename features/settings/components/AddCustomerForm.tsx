import { useState, useRef, useEffect } from 'preact/hooks';
import { validateName } from '@/features/settings/validators';
import { Check, X } from 'lucide-preact';
import { t } from '@/features/shared/i18n';

interface AddCustomerFormProps {
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}

export function AddCustomerForm({ onSave, onCancel }: AddCustomerFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSave() {
    const validation = validateName(name.trim(), 'Customer');
    if (!validation.valid) {
      setError(validation.error!);
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave(name.trim());
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="card card-border mb-6 border-warning/40 bg-warning/10 p-6">
      <h3 class="mb-4 font-semibold text-warning-content">{t('addCustomer') || 'Add New Customer'}</h3>
      <div class="mb-4">
        <label class="mb-2 block font-semibold">{t('customerName') || 'Customer Name'}:</label>
        <input
          ref={inputRef}
          type="text"
          class={`input input-bordered w-full ${error ? 'input-error' : ''}`}
          placeholder="e.g. Acme, Contoso, Globex..."
          value={name}
          onInput={e => setName((e.target as HTMLInputElement).value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        {error && <span class="mt-1 block text-xs text-error">{error}</span>}
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Check size={16} /> {t('save') || 'Save'}
        </button>
        <button type="button" class="btn btn-secondary" onClick={onCancel}>
          <X size={16} /> {t('cancel') || 'Cancel'}
        </button>
      </div>
    </div>
  );
}
