/**
 * DockPanel — a bottom-docked, resizable panel (DevTools-style).
 *
 * Replaces centered `modal modal-open` popups that re-center (and visually
 * jump) whenever their content height changes between tabs. The dock panel
 * has a fixed position/size instead, so switching tabs never moves it.
 */

import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

const STORAGE_KEY = 'flowmate-dock-panel-height';
const DEFAULT_HEIGHT = 420;
const MIN_HEIGHT = 220;
const TOP_MARGIN = 80; // keep some of the iFlow canvas visible above the panel

function loadHeight(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed >= MIN_HEIGHT ? parsed : DEFAULT_HEIGHT;
  } catch {
    return DEFAULT_HEIGHT;
  }
}

interface DockPanelProps {
  /** Pinned top area (title row, tabs) — never scrolls. */
  header: ComponentChildren;
  /** Scrollable body content. */
  children: ComponentChildren;
}

export function DockPanel({ header, children }: DockPanelProps) {
  const [height, setHeight] = useState(loadHeight);
  const draggingRef = useRef(false);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current) return;
    const next = Math.min(window.innerHeight - TOP_MARGIN, Math.max(MIN_HEIGHT, window.innerHeight - e.clientY));
    setHeight(next);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      localStorage.setItem(STORAGE_KEY, String(height));
    } catch {
      // ignore — persistence is a nice-to-have, not required
    }
  }, [height]);

  // Clamp a persisted height if the viewport shrank (e.g. window resized).
  useEffect(() => {
    const max = window.innerHeight - TOP_MARGIN;
    if (height > max) setHeight(Math.max(MIN_HEIGHT, max));
  }, [height]);

  return (
    <div
      class="fixed inset-x-0 bottom-0 z-[10050] flex flex-col overflow-hidden border-t border-base-300 bg-base-100 shadow-2xl"
      style={{ height: `${height}px` }}
    >
      <div
        class="flex h-2.5 shrink-0 cursor-ns-resize items-center justify-center touch-none hover:bg-base-200"
        title="Drag to resize"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div class="h-1 w-10 rounded-full bg-base-300" />
      </div>
      {header}
      <div class="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
