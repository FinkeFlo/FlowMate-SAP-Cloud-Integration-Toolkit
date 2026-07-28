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
      if ((e.target as HTMLElement).classList.contains('confirm-overlay')) {
        onCancel();
      }
    },
    [onCancel],
  );

  return (
    <div class="confirm-overlay" onClick={handleOverlayClick}>
      <div class="confirm-dialog">
        <p class="confirm-message">{message}</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-secondary" onClick={onCancel}>
            {t('cancel') || 'Cancel'}
          </button>
          <button type="button" class="btn btn-danger" onClick={onConfirm}>
            {t('delete') || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
