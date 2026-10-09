import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { ChevronDown, ChevronUp } from 'lucide-preact';
import { useDrag, getSavedWidth, MIN_WIDTH, MAX_WIDTH, WIDTH_STORAGE_KEY } from './useDrag';
import { t } from '@/features/shared/i18n';
import { FlowMateLogo } from '@/features/shared/FlowMateLogo';
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
      class={minimized
        ? 'fixed z-[9999] select-none rounded-full shadow-float'
        : 'fixed z-[9999] select-none rounded-box border border-base-300 bg-base-100 py-1.5 pr-3.5 pl-1.5 shadow-float'}
      style={{ ...positionStyle, width: minimized ? undefined : `${width}px` }}
    >
      {/* Header row: the ink handle carries the FlowMate branding, expanded or
          minimized (then it is all that remains). Dragging is scoped to this
          handle only — attaching it to the whole container would let
          pointerdown/move bubbling from any nested button (message log filters,
          refresh, etc.) hijack the drag instead of triggering its own click. */}
      <button
        ref={handleRef}
        class="btn btn-neutral btn-sm w-full cursor-grab justify-start gap-2 pr-3 pl-1 touch-none"
        title={minimized ? t('showToolbar') : t('hideToolbar')}
        aria-expanded={!minimized}
        onClick={toggleMinimized}
        {...dragHandlers}
      >
        <FlowMateLogo />
        <span class="text-sm font-bold leading-none tracking-tight">{t('extName')}</span>
        {minimized ? (
          <ChevronDown size={14} class="ml-auto text-neutral-content/70" />
        ) : (
          <ChevronUp size={14} class="ml-auto text-neutral-content/70" />
        )}
      </button>
      {!minimized && (
        <div class="mt-1.5 flex flex-col items-stretch gap-1">
          {children}
        </div>
      )}
      {/* Right-edge resize handle */}
      {!minimized && (
        <div
          class="group absolute right-0 top-0 flex h-full w-3.5 cursor-ew-resize touch-none items-center justify-center rounded-r-box hover:bg-base-200"
          title={t('resizeToolbar')}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
        >
          <div class="flex flex-col gap-[3px] opacity-60 transition-opacity group-hover:opacity-100">
            <div class="size-[3px] rounded-full bg-border" />
            <div class="size-[3px] rounded-full bg-border" />
            <div class="size-[3px] rounded-full bg-border" />
          </div>
        </div>
      )}
    </div>
  );
}
