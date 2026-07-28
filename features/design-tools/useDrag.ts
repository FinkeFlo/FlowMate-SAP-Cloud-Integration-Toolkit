import { useRef, useCallback, useEffect } from 'preact/hooks';

const DRAG_THRESHOLD = 5;
const POSITION_STORAGE_KEY = 'flowmate-design-toolbar-position';

interface Position {
  x: number;
  y: number;
}

function getSavedPosition(): Position | null {
  try {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (saved) {
      const pos = JSON.parse(saved);
      if (pos.x >= 0 && pos.y >= 0 && pos.x < window.innerWidth && pos.y < window.innerHeight) {
        return pos;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function savePosition(x: number, y: number): void {
  localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x, y }));
}

export function useDrag() {
  const containerRef = useRef<HTMLDivElement>(null);
  // Drag start/move/up handlers are only ever attached to this element (the
  // header/handle), so pointer capture must be set on this same element too —
  // capturing on a different node than the one holding the listeners would
  // silently stop them from receiving the retargeted events.
  const handleRef = useRef<HTMLButtonElement>(null);
  const stateRef = useRef({
    isDragging: false,
    wasDragged: false,
    activePointerId: null as number | null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });

  const initialPosition = getSavedPosition();

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0 || !containerRef.current) return;

    const s = stateRef.current;
    s.activePointerId = e.pointerId;
    s.isDragging = true;
    s.wasDragged = false;
    s.startX = e.clientX;
    s.startY = e.clientY;

    const rect = containerRef.current.getBoundingClientRect();
    s.offsetX = e.clientX - rect.left;
    s.offsetY = e.clientY - rect.top;
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    const container = containerRef.current;
    const handle = handleRef.current;
    if (!s.isDragging || e.pointerId !== s.activePointerId || !container || !handle) return;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;

    if (!s.wasDragged && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
      return;
    }

    if (!s.wasDragged) {
      s.wasDragged = true;
      handle.setPointerCapture(e.pointerId);
      container.style.cursor = 'grabbing';
    }

    const rect = container.getBoundingClientRect();
    let newX = e.clientX - s.offsetX;
    let newY = e.clientY - s.offsetY;
    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));

    container.style.left = `${newX}px`;
    container.style.top = `${newY}px`;
    container.style.right = 'auto';
  }, []);

  const onPointerUp = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    const container = containerRef.current;
    const handle = handleRef.current;
    if (!s.isDragging || e.pointerId !== s.activePointerId || !container || !handle) return;

    s.isDragging = false;
    s.activePointerId = null;

    if (s.wasDragged) {
      handle.releasePointerCapture(e.pointerId);
      container.style.cursor = 'grab';
      const rect = container.getBoundingClientRect();
      savePosition(rect.left, rect.top);
    }
  }, []);

  // Cleanup on unmount not needed — listeners are on the ref element via JSX props
  // But we need a cleanup for the case where the component unmounts during a drag
  useEffect(() => {
    const s = stateRef.current;
    return () => {
      s.isDragging = false;
      s.activePointerId = null;
    };
  }, []);

  return {
    containerRef,
    handleRef,
    initialPosition,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
