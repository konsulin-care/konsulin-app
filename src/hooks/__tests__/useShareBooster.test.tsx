import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useShareBooster } from '../useShareBooster';

describe('useShareBooster', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts at zero with no badge and increments', () => {
    const { result } = renderHook(() => useShareBooster());

    expect(result.current.count).toBe(0);
    expect(result.current.badge).toBeNull();

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
    expect(result.current.badge).toBe('buddy');
  });

  it('persists the counter across remounts', () => {
    const first = renderHook(() => useShareBooster());
    act(() => {
      first.result.current.increment();
    });
    act(() => {
      first.result.current.increment();
    });
    first.unmount();

    const second = renderHook(() => useShareBooster());
    expect(second.result.current.count).toBe(2);
    expect(second.result.current.badge).toBe('buddy');
  });

  it('unlocks the captain badge at five shares', () => {
    const { result } = renderHook(() => useShareBooster());
    for (let i = 0; i < 5; i += 1) {
      act(() => {
        result.current.increment();
      });
    }
    expect(result.current.count).toBe(5);
    expect(result.current.badge).toBe('captain');
  });
});
