"use client";

import { useRef, useCallback, useState } from "react";

export function useFps() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const lastTime = useRef(performance.now());

  const tick = useCallback(() => {
    frames.current++;
    const now = performance.now();
    if (now - lastTime.current >= 1000) {
      setFps(frames.current);
      frames.current = 0;
      lastTime.current = now;
    }
  }, []);

  return { fps, tick };
}
