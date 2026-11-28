'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Delay before the scroll indicator hides again, in milliseconds. */
const HIDE_DELAY_MS = 800;

/** Geometry of the scroll indicator overlay. */
export interface ScrollIndicatorState {
  /** True while a scroll happened within the last 800ms. */
  visible: boolean;
  /** Thumb offset from the top of the viewport, in pixels. */
  top: number;
  /** Thumb height, in pixels. */
  height: number;
  /** True when the document is taller than the viewport. */
  overflows: boolean;
}

const INITIAL_STATE: ScrollIndicatorState = {
  visible: false,
  top: 0,
  height: 0,
  overflows: false
};

/**
 * Read the current scroll geometry from the window.
 *
 * @returns The indicator state derived from innerHeight, scrollHeight and scrollY
 */
function readScrollState(): Omit<ScrollIndicatorState, 'visible'> {
  const viewport = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollTop = window.scrollY;
  const overflows = documentHeight > viewport;

  if (!overflows || viewport <= 0) {
    return { top: 0, height: 0, overflows: false };
  }

  const height = (viewport * viewport) / documentHeight;
  const scrollable = documentHeight - viewport;
  const top = (scrollTop / scrollable) * (viewport - height);

  return { top, height, overflows: true };
}

/**
 * Track page scroll position to drive a 3px overlay scroll indicator.
 *
 * Listens to passive `scroll` and `resize` events. `visible` turns true on
 * scroll and false 800ms after the last scroll event.
 *
 * @returns The indicator {@link ScrollIndicatorState}
 */
export function useScrollIndicator(): ScrollIndicatorState {
  const [state, setState] = useState<ScrollIndicatorState>(INITIAL_STATE);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Clear the pending hide timeout, if any. */
  const clearHideTimer = useCallback(() => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  useEffect(() => {
    /** Recompute geometry without changing visibility. */
    const measure = () => {
      const next = readScrollState();
      setState(previous => ({ ...previous, ...next }));
    };

    /** Recompute geometry and keep the indicator visible for 800ms. */
    const handleScroll = () => {
      const next = readScrollState();
      setState({ ...next, visible: true });
      clearHideTimer();
      hideTimer.current = setTimeout(() => {
        hideTimer.current = null;
        setState(previous => ({ ...previous, visible: false }));
      }, HIDE_DELAY_MS);
    };

    measure();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', measure);

    return () => {
      clearHideTimer();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', measure);
    };
  }, [clearHideTimer]);

  return state;
}
