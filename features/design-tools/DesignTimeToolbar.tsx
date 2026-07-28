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
      class="design-toolbar"
      style={positionStyle}
      {...dragHandlers}
    >
      {minimized ? (
        <button
          class="flex w-full items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1 text-base-content transition-colors hover:bg-base-content/5 cursor-pointer"
          title={t('showToolbar')}
          onClick={toggleMinimized}
        >
          <svg width="16" height="16" viewBox="0 0 128 128" aria-hidden="true">
            <rect width="128" height="128" rx="22" fill="#0070F2" />
            <path d="M 32 24 H 100 V 40 H 48 V 56 H 88 V 72 H 48 V 104 H 32 Z" fill="white" />
          </svg>
          <span class="text-sm font-semibold leading-none">{t('extName')}</span>
          <ChevronDown size={14} class="ml-auto opacity-60" />
        </button>
      ) : (
        <button
          class="flex w-full items-center justify-center rounded-md border-0 bg-transparent px-0 py-1 text-base-content-soft transition-colors hover:bg-base-content/5 hover:text-base-content cursor-pointer"
          title={t('hideToolbar')}
          onClick={toggleMinimized}
        >
          <ChevronUp size={16} />
        </button>
      )}
      {!minimized && (
        <div class="flex flex-col items-stretch gap-1">
          {children}
        </div>
      )}
    </div>
  );
}
