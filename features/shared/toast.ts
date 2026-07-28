/**
 * Toast Notifications — SAP Fiori-style
 *
 * Dispatches a CustomEvent. The <ToastContainer> Preact component
 * listens for 'flowmate:toast' events and renders the UI.
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';

export function showToast(message: string, type: ToastType = 'info'): void {
  document.dispatchEvent(
    new CustomEvent('flowmate:toast', {
      detail: { message, toastType: type },
    }),
  );
}
