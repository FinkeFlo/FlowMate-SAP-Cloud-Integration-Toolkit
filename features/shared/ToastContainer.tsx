import { useState, useEffect, useCallback } from 'preact/hooks';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

const TYPE_CONFIG: Record<ToastType, { alertClass: string; icon: string }> = {
  success: { alertClass: 'alert-success', icon: '\u2714' },
  error: { alertClass: 'alert-error', icon: '\u2716' },
  warning: { alertClass: 'alert-warning', icon: '\u26A0' },
  info: { alertClass: 'alert-info', icon: '\u2139' },
};

const AUTO_DISMISS_MS = 4000;
const EXIT_ANIMATION_MS = 200;

let nextId = 0;

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const handleToastEvent = useCallback((e: Event) => {
    const { message, toastType } = (e as CustomEvent).detail;
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type: toastType, leaving: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, EXIT_ANIMATION_MS);
    }, AUTO_DISMISS_MS);
  }, []);

  useEffect(() => {
    document.addEventListener('flowmate:toast', handleToastEvent);
    return () => document.removeEventListener('flowmate:toast', handleToastEvent);
  }, [handleToastEvent]);

  if (toasts.length === 0) return null;

  return (
    <div class="toast toast-end toast-bottom z-[10000000] flex flex-col-reverse gap-2">
      {toasts.map(toast => {
        const config = TYPE_CONFIG[toast.type];
        return (
          <div
            key={toast.id}
            class={`alert ${config.alertClass} max-w-[400px] shadow-lg transition-all duration-200 ${toast.leaving ? 'translate-x-5 opacity-0' : 'translate-x-0 opacity-100'}`}
          >
            <span class="text-base leading-none">{config.icon}</span>
            <span class="break-words text-sm">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
