import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInfiniteScroll } from '../useInfiniteScroll';

describe('useInfiniteScroll', () => {
  let originalIntersectionObserver: typeof IntersectionObserver;

  beforeEach(() => {
    originalIntersectionObserver = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIntersectionObserver;
  });

  it('returns a ref that can be attached to a sentinel element', () => {
    const onLoadMore = vi.fn();
    const { result } = renderHook(() => useInfiniteScroll(onLoadMore));

    expect(result.current).toHaveProperty('current');
  });

  it('creates an IntersectionObserver when sentinel ref is attached to DOM', () => {
    const onLoadMore = vi.fn();
    const { result, rerender } = renderHook(
      ({ onLoad }) => useInfiniteScroll(onLoad),
      { initialProps: { onLoad: onLoadMore } }
    );

    // Initially no observer because ref is null
    expect(globalThis.IntersectionObserver).not.toHaveBeenCalled();
    expect(result.current.current).toBeNull();

    // Simulate sentinel div being attached
    result.current.current = document.createElement('div');
    rerender({ onLoad: onLoadMore });

    expect(globalThis.IntersectionObserver).toHaveBeenCalled();
  });

  it('calls onLoadMore when sentinel becomes visible', () => {
    const onLoadMore = vi.fn();
    let callback: (entries: IntersectionObserverEntry[]) => void = () => {
      /* placeholder */
    };

    globalThis.IntersectionObserver = vi.fn().mockImplementation(cb => {
      callback = cb as (entries: IntersectionObserverEntry[]) => void;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });

    const { result, rerender } = renderHook(
      ({ onLoad }) => useInfiniteScroll(onLoad),
      { initialProps: { onLoad: onLoadMore } }
    );

    // Attach sentinel
    result.current.current = document.createElement('div');
    rerender({ onLoad: onLoadMore });

    // Simulate intersection
    callback([{ isIntersecting: true } as IntersectionObserverEntry]);
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('does not call onLoadMore when disabled', () => {
    const onLoadMore = vi.fn();
    let callback: (entries: IntersectionObserverEntry[]) => void = () => {
      /* placeholder */
    };

    globalThis.IntersectionObserver = vi.fn().mockImplementation(cb => {
      callback = cb as (entries: IntersectionObserverEntry[]) => void;
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });

    const { result, rerender } = renderHook(
      ({ onLoad, enabled }) => useInfiniteScroll(onLoad, { enabled }),
      { initialProps: { onLoad: onLoadMore, enabled: false } }
    );

    result.current.current = document.createElement('div');
    rerender({ onLoad: onLoadMore, enabled: false });

    callback([{ isIntersecting: true } as IntersectionObserverEntry]);
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
