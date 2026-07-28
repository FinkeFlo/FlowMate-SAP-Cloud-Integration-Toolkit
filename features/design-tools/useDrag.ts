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
    const el = containerRef.current;
    if (!s.isDragging || e.pointerId !== s.activePointerId || !el) return;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;

    if (!s.wasDragged && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
      return;
    }

    if (!s.wasDragged) {
      s.wasDragged = true;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    }

    const rect = el.getBoundingClientRect();
    let newX = e.clientX - s.offsetX;
    let newY = e.clientY - s.offsetY;
    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));

    el.style.left = `${newX}px`;
    el.style.top = `${newY}px`;
    el.style.right = 'auto';
  }, []);

  const onPointerUp = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    const el = containerRef.current;
    if (!s.isDragging || e.pointerId !== s.activePointerId || !el) return;

    s.isDragging = false;
    s.activePointerId = null;

    if (s.wasDragged) {
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = 'grab';
      const rect = el.getBoundingClientRect();
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
    initialPosition,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
