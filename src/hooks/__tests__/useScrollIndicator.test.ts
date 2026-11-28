import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollIndicator } from '../useScrollIndicator';

/** Override the window geometry used by the hook. */
function stubGeometry({
  innerHeight,
  scrollHeight,
  scrollY
}: {
  innerHeight: number;
  scrollHeight: number;
  scrollY: number;
}) {
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: innerHeight
  });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: scrollHeight
  });
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value: scrollY
  });
}

/** Scroll the window by updating scrollY and dispatching the scroll event. */
function scrollTo(offset: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    writable: true,
    value: offset
  });
  window.dispatchEvent(new Event('scroll'));
}

beforeEach(() => {
  vi.useFakeTimers();
  stubGeometry({ innerHeight: 1000, scrollHeight: 3000, scrollY: 0 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useScrollIndicator', () => {
  it('reports overflow for a tall document', () => {
    const { result } = renderHook(() => useScrollIndicator());
    expect(result.current.overflows).toBe(true);
    expect(result.current.height).toBeCloseTo((1000 * 1000) / 3000);
    expect(result.current.visible).toBe(false);
  });

  it('reports no overflow for a short document', () => {
    stubGeometry({ innerHeight: 1000, scrollHeight: 800, scrollY: 0 });
    const { result } = renderHook(() => useScrollIndicator());
    expect(result.current.overflows).toBe(false);
  });

  it('updates top and height on scroll and turns visible', () => {
    const { result } = renderHook(() => useScrollIndicator());

    act(() => {
      scrollTo(1000);
    });

    const height = (1000 * 1000) / 3000;
    expect(result.current.visible).toBe(true);
    expect(result.current.height).toBeCloseTo(height);
    expect(result.current.top).toBeCloseTo((1000 / 2000) * (1000 - height));
  });

  it('hides 800ms after the last scroll event', () => {
    const { result } = renderHook(() => useScrollIndicator());

    act(() => {
      scrollTo(500);
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(799);
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.visible).toBe(false);
  });

  it('restarts the hide timer on each scroll event', () => {
    const { result } = renderHook(() => useScrollIndicator());

    act(() => {
      scrollTo(200);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      scrollTo(400);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.visible).toBe(false);
  });

  it('removes listeners and clears the timer on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useScrollIndicator());

    act(() => {
      scrollTo(100);
    });
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    removeSpy.mockRestore();
  });
});
