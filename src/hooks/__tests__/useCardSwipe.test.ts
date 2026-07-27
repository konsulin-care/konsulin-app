/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCardSwipe } from '../useCardSwipe';

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
      result.current.onTouchStart({ touches: [{ clientY: 200 }] } as any);
    });

    act(() => {
      result.current.onTouchMove({ touches: [{ clientY: 100 }] } as any);
    });

    act(() => {
      result.current.onTouchEnd({} as any);
    });

    expect(result.current.swipeDirection).toBe('up');
  });

  it('detects swipe down when deltaY < -threshold', () => {
    const { result } = renderHook(() => useCardSwipe());

    act(() => {
      result.current.onTouchStart({ touches: [{ clientY: 100 }] } as any);
    });

    act(() => {
      result.current.onTouchMove({ touches: [{ clientY: 200 }] } as any);
    });

    act(() => {
      result.current.onTouchEnd({} as any);
    });

    expect(result.current.swipeDirection).toBe('down');
  });

  it('ignores sub-threshold movements (tap)', () => {
    const { result } = renderHook(() => useCardSwipe());

    act(() => {
      result.current.onTouchStart({ touches: [{ clientY: 200 }] } as any);
    });

    act(() => {
      result.current.onTouchMove({ touches: [{ clientY: 190 }] } as any);
    });

    act(() => {
      result.current.onTouchEnd({} as any);
    });

    expect(result.current.swipeDirection).toBeNull();
  });

  it('resets swipeDirection to null after 300ms', async () => {
    const { result } = renderHook(() => useCardSwipe());

    act(() => {
      result.current.onTouchStart({ touches: [{ clientY: 200 }] } as any);
    });

    act(() => {
      result.current.onTouchMove({ touches: [{ clientY: 100 }] } as any);
    });

    act(() => {
      result.current.onTouchEnd({} as any);
    });

    expect(result.current.swipeDirection).toBe('up');

    // Wait for timeout
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    expect(result.current.swipeDirection).toBeNull();
  });
});
