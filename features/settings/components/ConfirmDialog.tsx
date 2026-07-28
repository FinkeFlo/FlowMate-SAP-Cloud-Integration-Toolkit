import { useEffect, useCallback } from 'preact/hooks';
import { t } from '@/features/shared/i18n';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('modal')) {
        onCancel();
      }
    },
    [onCancel],
  );

  return (
    <div class="modal modal-open" onClick={handleOverlayClick}>
      <div class="modal-box">
        <p class="mb-6">{message}</p>
        <div class="modal-action">
          <button type="button" class="btn btn-secondary" onClick={onCancel}>
            {t('cancel') || 'Cancel'}
          </button>
          <button type="button" class="btn btn-error" onClick={onConfirm}>
            {t('delete') || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
