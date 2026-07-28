import { useState, useEffect, useCallback } from 'preact/hooks';
import './ToastContainer.css';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

const TYPE_CONFIG: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: '#f1fdf4', border: '#107e3e', icon: '\u2714' },
  error:   { bg: '#fef2f2', border: '#bb0000', icon: '\u2716' },
  warning: { bg: '#fef9ee', border: '#e9730c', icon: '\u26A0' },
  info:    { bg: '#eff6ff', border: '#0a6ed1', icon: '\u2139' },
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
    <div class="flowmate-toast-container">
      {toasts.map(toast => {
        const config = TYPE_CONFIG[toast.type];
        return (
          <div
            key={toast.id}
            class={`flowmate-toast ${toast.leaving ? 'flowmate-toast--leaving' : ''}`}
            style={{
              background: config.bg,
              borderLeft: `4px solid ${config.border}`,
            }}
          >
            {config.icon}  {toast.message}
          </div>
        );
      })}
    </div>
  );
}
