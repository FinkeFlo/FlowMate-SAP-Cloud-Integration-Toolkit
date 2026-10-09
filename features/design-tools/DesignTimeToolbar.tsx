import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ChevronDown, ChevronUp } from 'lucide-preact';
import { useDrag, getSavedWidth, MIN_WIDTH, MAX_WIDTH, WIDTH_STORAGE_KEY } from './useDrag';
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

/**
 * The FlowMate app icon at its small optical size (public/icon.svg is the
 * regular one): an F drawn as an integration route, the dot is the message.
 * Colors come from the theme (primary = petrol tile, accent = spark).
 */
function FlowMateLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" class="shrink-0">
      <rect width="48" height="48" rx="11" class="fill-primary" />
      <g transform="translate(24.6 24) scale(.92) translate(-24 -24)">
        <g fill="none" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" class="stroke-primary-content">
          <path d="M14 38V17a7 7 0 0 1 7-7h12" />
          <path d="M14 24h7" />
        </g>
        <circle cx="31.5" cy="24" r="5.5" class="fill-accent" />
      </g>
    </svg>
  );
}

interface DesignTimeToolbarProps {
  children: ComponentChildren;
}

export function DesignTimeToolbar({ children }: DesignTimeToolbarProps) {
  const [minimized, setMinimized] = useState(loadMinimized);
  const { containerRef, handleRef, initialPosition, dragHandlers } = useDrag();
  const [width, setWidth] = useState(getSavedWidth);
  const resizingRef = useRef(false);

  const toggleMinimized = () => {
    const next = !minimized;
    setMinimized(next);
    localStorage.setItem(MINIMIZED_STORAGE_KEY, next ? 'true' : 'false');
  };

  const positionStyle = initialPosition
    ? { left: `${initialPosition.x}px`, top: `${initialPosition.y}px` }
    : { top: '80px', right: '20px' };

  const handleResizePointerDown = useCallback((e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handleResizePointerMove = useCallback((e: PointerEvent) => {
    if (!resizingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - rect.left));
    setWidth(newWidth);
    containerRef.current.style.width = `${newWidth}px`;
  }, [containerRef]);

  const handleResizePointerUp = useCallback(() => {
    resizingRef.current = false;
  }, []);

  // Persist the width whenever it changes (not only on pointer-up): the
  // pointer-up handler would otherwise close over a stale `width` value.
  useEffect(() => {
    try { localStorage.setItem(WIDTH_STORAGE_KEY, String(width)); } catch { /* ignore */ }
  }, [width]);

  return (
    <div
      ref={containerRef}
      class="fixed z-[9999] select-none rounded-box border border-base-300 bg-base-100/95 pr-3 pl-1.5 py-1.5 shadow-lg backdrop-blur-sm"
      style={{ ...positionStyle, width: `${width}px` }}
    >
      {/* Header row: FlowMate branding stays visible whether minimized or expanded.
          Dragging is scoped to this handle only — attaching it to the whole
          container would let pointerdown/move bubbling from any nested button
          (message log filters, refresh, etc.) hijack the drag instead of
          triggering its own click. */}
      <button
        ref={handleRef}
        class="btn btn-ghost btn-sm w-full cursor-grab justify-start gap-2 px-2 touch-none"
        title={minimized ? t('showToolbar') : t('hideToolbar')}
        onClick={toggleMinimized}
        {...dragHandlers}
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
      {/* Right-edge resize handle */}
      <div
        class="group absolute right-0 top-0 flex h-full w-3 cursor-ew-resize touch-none items-center justify-center rounded-r-box hover:bg-base-300/50"
        title={t('resizeToolbar')}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
      >
        <div class="flex flex-col gap-[3px] opacity-30 group-hover:opacity-70 transition-opacity">
          <div class="h-1 w-1 rounded-full bg-base-content" />
          <div class="h-1 w-1 rounded-full bg-base-content" />
          <div class="h-1 w-1 rounded-full bg-base-content" />
        </div>
      </div>
    </div>
  );
}
