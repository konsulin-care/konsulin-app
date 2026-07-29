'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SCROLL_THRESHOLD = 10;
const SCROLL_HIDE_OFFSET = 100;

/**
 * Tracks scroll direction and returns visibility boolean.
 * When `isInteractive` is true, the element stays visible regardless of scroll.
 */
export function useScrollHide(isInteractive: boolean): boolean {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    if (isInteractive) return;
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY.current;
    if (Math.abs(delta) < SCROLL_THRESHOLD) return;
    if (delta > 0 && currentY > SCROLL_HIDE_OFFSET) setIsVisible(false);
    else if (delta < 0) setIsVisible(true);
    lastScrollY.current = currentY;
  }, [isInteractive]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return isVisible;
}
