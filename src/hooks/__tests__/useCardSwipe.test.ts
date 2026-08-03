import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCardSwipe } from '../useCardSwipe';

/**
 * Builds a minimal touch event exposing only `touches[0].clientY`.
 * The hook only reads the first touch's clientY for start/move gestures.
 */
const touchStart = (clientY: number) =>
  ({ touches: [{ clientY }] }) as unknown as React.TouchEvent;

/** Empty touch end event — the hook ignores the argument and uses refs. */
const touchEnd = {} as unknown as React.TouchEvent;

describe('useCardSwipe', () => {
  it('returns gesture handlers and null direction initially', () => {
    const { result } = renderHook(() => useCardSwipe());

    expect(result.current.onTouchStart).toBeInstanceOf(Function);
    expect(result.current.onTouchMove).toBeInstanceOf(Function);
    expect(result.current.onTouchEnd).toBeInstanceOf(Function);
    expect(result.current.swipeDirection).toBeNull();
  });

  it('detects swipe up when deltaY > threshold', () => {
    const { result } = renderHook(() => useCardSwipe());

    act(() => {
      result.current.onTouchStart(touchStart(200));
    });

    act(() => {
      result.current.onTouchMove(touchStart(100));
    });

    act(() => {
      result.current.onTouchEnd(touchEnd);
    });

    expect(result.current.swipeDirection).toBe('up');
  });

  it('detects swipe down when deltaY < -threshold', () => {
    const { result } = renderHook(() => useCardSwipe());

    act(() => {
      result.current.onTouchStart(touchStart(100));
    });

    act(() => {
      result.current.onTouchMove(touchStart(200));
    });

    act(() => {
      result.current.onTouchEnd(touchEnd);
    });

    expect(result.current.swipeDirection).toBe('down');
  });

  it('ignores sub-threshold movements (tap)', () => {
    const { result } = renderHook(() => useCardSwipe());

    act(() => {
      result.current.onTouchStart(touchStart(200));
    });

    act(() => {
      result.current.onTouchMove(touchStart(190));
    });

    act(() => {
      result.current.onTouchEnd(touchEnd);
    });

    expect(result.current.swipeDirection).toBeNull();
  });

  it('resets swipeDirection to null after 300ms', async () => {
    const { result } = renderHook(() => useCardSwipe());

    act(() => {
      result.current.onTouchStart(touchStart(200));
    });

    act(() => {
      result.current.onTouchMove(touchStart(100));
    });

    act(() => {
      result.current.onTouchEnd(touchEnd);
    });

    expect(result.current.swipeDirection).toBe('up');

    // Wait for timeout
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(result.current.swipeDirection).toBeNull();
  });
});
