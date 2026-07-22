import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInfiniteScroll } from '../useInfiniteScroll';

describe('useInfiniteScroll', () => {
  let originalIntersectionObserver: typeof IntersectionObserver;
  let capturedCallback:
    | ((entries: IntersectionObserverEntry[]) => void)
    | undefined;

  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
      capturedCallback = cb;
    }
  }

  beforeEach(() => {
    originalIntersectionObserver = globalThis.IntersectionObserver;
    capturedCallback = undefined;
    globalThis.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
  });

  it('returns a ref that can be attached to a sentinel element', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() => useInfiniteScroll(onLoadMore));

    expect(result.current).toHaveProperty('current');
  });

  it('calls onLoadMore when sentinel becomes visible', () => {
    const onLoadMore = vi.fn();

    const { result, rerender } = renderHook(
      ({ onLoad, enabled }) => useInfiniteScroll(onLoad, { enabled }),
      { initialProps: { onLoad: onLoadMore, enabled: false } }
    );

    // Attach sentinel then enable — effect re-runs when enabled flips
    (result.current as { current: HTMLElement | null }).current =
      document.createElement('div');
    rerender({ onLoad: onLoadMore, enabled: true });

    // Simulate intersection via captured callback
    expect(capturedCallback).toBeDefined();
    capturedCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('does not call onLoadMore when disabled', () => {
    const onLoadMore = vi.fn();

    const { result, rerender } = renderHook(
      ({ onLoad, enabled }) => useInfiniteScroll(onLoad, { enabled }),
      { initialProps: { onLoad: onLoadMore, enabled: false } }
    );

    (result.current as { current: HTMLElement | null }).current =
      document.createElement('div');
    rerender({ onLoad: onLoadMore, enabled: false });

    capturedCallback?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
