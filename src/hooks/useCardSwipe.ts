'use client';

import { useCallback, useRef, useState } from 'react';

const SWIPE_THRESHOLD = 50;
const RESET_TIMEOUT = 300;

export type SwipeDirection = 'up' | 'down';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

interface CardSwipeResult extends SwipeHandlers {
  swipeDirection: SwipeDirection | null;
}

/**
 * Hook that detects vertical swipe gestures on touch devices.
 *
 * Tracks touch start/move/end events and computes whether the gesture
 * is a swipe up or down based on the vertical distance travelled.
 * Sub-threshold movements (< 50px) are ignored as taps.
 * The swipe direction resets to null after 300ms.
 *
 * @returns Touch event handlers and the current swipe direction
 */
export function useCardSwipe(): CardSwipeResult {
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(
    null
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchEndY.current = null;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (touchStartY.current === null || touchEndY.current === null) return;

    const deltaY = touchStartY.current - touchEndY.current;

    if (Math.abs(deltaY) < SWIPE_THRESHOLD) {
      setSwipeDirection(null);
      return;
    }

    setSwipeDirection(deltaY > 0 ? 'up' : 'down');

    timeoutRef.current = setTimeout(() => {
      setSwipeDirection(null);
      timeoutRef.current = null;
    }, RESET_TIMEOUT);
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, swipeDirection };
}
