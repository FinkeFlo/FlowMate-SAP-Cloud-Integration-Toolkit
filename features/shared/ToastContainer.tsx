import { useState, useEffect, useCallback } from 'preact/hooks';
import { Check, X, TriangleAlert, Info } from 'lucide-preact';
import { TONE_DISC_CLASS, type StatusTone } from '@/features/shared/status-tone';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  leaving: boolean;
}

// Toasts are FlowMate reporting back, so they use the ink chrome (neutral);
// the status disc carries color and icon, the sentence carries the meaning.
const TYPE_CONFIG: Record<ToastType, { tone: StatusTone; Icon: typeof Check; role: 'status' | 'alert' }> = {
  success: { tone: 'success', Icon: Check, role: 'status' },
  error: { tone: 'error', Icon: X, role: 'alert' },
  warning: { tone: 'warning', Icon: TriangleAlert, role: 'alert' },
  info: { tone: 'info', Icon: Info, role: 'status' },
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
        const { tone, Icon, role } = TYPE_CONFIG[toast.type];
        return (
          <div
            key={toast.id}
            role={role}
            class={`alert max-w-[400px] gap-2.5 rounded-box border-0 bg-neutral py-2.5 pr-4 pl-2.5 text-neutral-content shadow-float transition-all duration-200 ${toast.leaving ? 'translate-x-5 opacity-0' : 'translate-x-0 opacity-100'}`}
          >
            <span class={`flex size-[22px] shrink-0 items-center justify-center rounded-full ${TONE_DISC_CLASS[tone]}`}>
              <Icon size={13} strokeWidth={3} />
            </span>
            <span class="break-words text-[13px] leading-[18px]">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
