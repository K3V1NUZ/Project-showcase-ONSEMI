"use client";

import { useRef } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";

type Options = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minDx?: number; // horizontal distance required (px)
  maxDy?: number; // vertical wobble allowed (px)
};

// Touch handlers to spread onto a container: <div {...useSwipe({...})}>.
// Distinguishes a decisive horizontal drag from a scroll (vertical > maxDy is
// ignored) so pull-to-refresh and list scrolls stay unaffected.
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  minDx = 60,
  maxDy = 40,
}: Options) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  return {
    onTouchStart: (e: ReactTouchEvent) => {
      const t = e.touches[0];
      startX.current = t.clientX;
      startY.current = t.clientY;
    },
    onTouchEnd: (e: ReactTouchEvent) => {
      if (startX.current == null || startY.current == null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      startX.current = null;
      startY.current = null;
      if (Math.abs(dx) < minDx) return;
      if (Math.abs(dy) > maxDy) return;
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    },
  };
}
