"use client";

import { useRef, useCallback, useState } from "react";

/**
 * Drag-to-move hook using refs to avoid stale closures.
 */
export function useDrag() {
  const [, forceUpdate] = useState(0);
  const posRef = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startMouse = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    startPos.current = { ...posRef.current };
    startMouse.current = { x: e.clientX, y: e.clientY };
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    posRef.current = {
      x: startPos.current.x + (e.clientX - startMouse.current.x),
      y: startPos.current.y + (e.clientY - startMouse.current.y),
    };
    forceUpdate((n) => n + 1);
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const reset = useCallback(() => {
    posRef.current = { x: 0, y: 0 };
    dragging.current = false;
    forceUpdate((n) => n + 1);
  }, []);

  return {
    position: posRef.current,
    isDragging: dragging.current,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
    reset,
  };
}
