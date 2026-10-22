import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

type UseInfiniteScrollOptions = {
  enabled?: boolean;
  threshold?: number;
  rootMargin?: string;
};

/**
 * Hook that calls `onLoadMore` when a sentinel element enters the viewport.
 *
 * Returns a ref to attach to a sentinel `<div>` at the bottom of a scrollable list.
 * Uses IntersectionObserver internally.
 *
 * @param onLoadMore - Callback fired when sentinel becomes visible.
 * @param options.enabled - Disables observation when false (default: true).
 * @param options.threshold - Intersection ratio threshold (default: 0.1).
 * @param options.rootMargin - IntersectionObserver rootMargin (default: '200px').
 */
export function useInfiniteScroll<T extends HTMLElement>(
  onLoadMore: () => void,
  options?: UseInfiniteScrollOptions
): RefObject<T | null> {
  const sentinelRef = useRef<T | null>(null);
  const {
    enabled = true,
    threshold = 0.1,
    rootMargin = '200px'
  } = options ?? {};

  /* eslint-disable consistent-return */
  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [enabled, onLoadMore, threshold, rootMargin]);
  /* eslint-enable consistent-return */

  return sentinelRef;
}
