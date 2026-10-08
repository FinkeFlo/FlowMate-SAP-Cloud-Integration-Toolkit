import { useEffect, useCallback, useRef, useState, useId } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { t } from '@/features/shared/i18n';

interface ConfirmDialogProps {
  /** Short question, rendered as the dialog heading. */
  title?: string;
  /** Explanatory text; line breaks are preserved. */
  message?: string;
  /** Optional list of affected items (artifact names, iFlows, …). */
  items?: string[];
  /** Label of the confirming button; defaults to the translated "Delete". */
  confirmLabel?: string;
  /** daisyUI color class of the confirming button, e.g. `btn-error`, `btn-success`, `btn-primary`. */
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Finds the element the modal should be portaled into: the mount container of
 * the Shadow Root (content script) or `document.body` (Options/Popup pages).
 * Rendering the modal as a child of the floating toolbar would confine it to
 * the toolbar box: `backdrop-filter` makes the toolbar the containing block
 * for `position: fixed` descendants.
 */
function resolvePortalTarget(anchor: Element): Element {
  const root = anchor.getRootNode();
  if (root instanceof ShadowRoot) {
    return root.querySelector('[data-theme]') ?? (root.firstElementChild as Element) ?? anchor;
  }
  return document.body;
}

/**
 * Shared confirmation modal (daisyUI `modal`). Replaces `window.confirm`, which
 * blocks the page, cannot be translated and ignores the FlowMate theme.
 * Works inside the content-script Shadow Root as well as on the Options page.
 */
export function ConfirmDialog({
  title,
  message,
  items,
  confirmLabel,
  confirmClass = 'btn-error',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const messageId = `${id}-message`;
  const destructive = confirmClass === 'btn-error';

  useEffect(() => {
    if (anchorRef.current) setPortalTarget(resolvePortalTarget(anchorRef.current));
  }, []);

  // Move focus into the dialog (Cancel for destructive actions so an accidental
  // Enter does nothing harmful) and give it back to the trigger on close.
  useEffect(() => {
    if (!portalTarget) return;
    const previous = (anchorRef.current?.getRootNode() as Document | ShadowRoot).activeElement as HTMLElement | null;
    (destructive ? cancelRef.current : confirmRef.current)?.focus();
    return () => previous?.focus?.();
  }, [portalTarget, destructive]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
        return;
      }
      if (e.key === 'Tab') {
        // Minimal focus trap between the two buttons.
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (!first || !last) return;
        const active = (e.currentTarget as HTMLElement).getRootNode() as Document | ShadowRoot;
        if (e.shiftKey && active.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onCancel],
  );

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('modal')) {
        onCancel();
      }
    },
    [onCancel],
  );

  const dialog = (
    <div
      class="modal modal-open z-[10050]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : messageId}
      aria-describedby={message ? messageId : undefined}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div class="modal-box text-base-content">
        {title && <h2 id={titleId} class="mb-3 text-lg font-semibold">{title}</h2>}
        {message && <p id={messageId} class="mb-4 whitespace-pre-line text-sm">{message}</p>}
        {items && items.length > 0 && (
          <ul class="mb-4 max-h-48 overflow-y-auto rounded-field bg-base-200 px-3 py-2 font-mono text-xs">
            {items.map(item => (
              <li key={item} class="break-all">{item}</li>
            ))}
          </ul>
        )}
        <div class="modal-action mt-6">
          <button ref={cancelRef} type="button" class="btn btn-secondary" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button ref={confirmRef} type="button" class={`btn ${confirmClass}`} onClick={onConfirm}>
            {confirmLabel ?? t('delete')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <span ref={anchorRef} hidden />
      {portalTarget && createPortal(dialog, portalTarget)}
    </>
  );
}
