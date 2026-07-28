import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ChevronDown, ChevronUp } from 'lucide-preact';
import { useDrag } from './useDrag';
import { t } from '@/features/shared/i18n';
import './DesignTimeToolbar.css';

const MINIMIZED_STORAGE_KEY = 'flowmate-design-toolbar-minimized';

function loadMinimized(): boolean {
  try {
    return localStorage.getItem(MINIMIZED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function FlowMateLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 128 128" aria-hidden="true" class="shrink-0">
      <rect width="128" height="128" rx="22" fill="#0070F2" />
      <path d="M 32 24 H 100 V 40 H 48 V 56 H 88 V 72 H 48 V 104 H 32 Z" fill="white" />
    </svg>
  );
}

interface DesignTimeToolbarProps {
  children: ComponentChildren;
}

export function DesignTimeToolbar({ children }: DesignTimeToolbarProps) {
  const [minimized, setMinimized] = useState(loadMinimized);
  const { containerRef, initialPosition, dragHandlers } = useDrag();

  const toggleMinimized = () => {
    const next = !minimized;
    setMinimized(next);
    localStorage.setItem(MINIMIZED_STORAGE_KEY, next ? 'true' : 'false');
  };

  const positionStyle = initialPosition
    ? { left: `${initialPosition.x}px`, top: `${initialPosition.y}px` }
    : { top: '80px', right: '20px' };

  return (
    <div
      ref={containerRef}
      class="fixed z-[9999] select-none cursor-grab rounded-box border border-base-300 bg-base-100/95 p-1.5 shadow-lg backdrop-blur-sm"
      style={positionStyle}
      {...dragHandlers}
    >
      {/* Header row: FlowMate branding stays visible whether minimized or expanded */}
      <button
        class="btn btn-ghost btn-sm w-full justify-start gap-2 px-2"
        title={minimized ? t('showToolbar') : t('hideToolbar')}
        onClick={toggleMinimized}
      >
        <FlowMateLogo />
        <span class="text-sm font-semibold leading-none">{t('extName')}</span>
        {minimized ? (
          <ChevronDown size={14} class="ml-auto opacity-60" />
        ) : (
          <ChevronUp size={14} class="ml-auto opacity-60" />
        )}
      </button>
      {!minimized && (
        <div class="mt-1 flex flex-col items-stretch gap-1">
          {children}
        </div>
      )}
    </div>
  );
}
