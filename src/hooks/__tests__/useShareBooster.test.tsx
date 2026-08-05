import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useShareBooster } from '../useShareBooster';

describe('useShareBooster', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts at zero and increments the count', () => {
    const { result } = renderHook(() => useShareBooster());

    expect(result.current.count).toBe(0);

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
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
  });

  it('counts every share toward XP without a badge cap', () => {
    const { result } = renderHook(() => useShareBooster());
    for (let i = 0; i < 5; i += 1) {
      act(() => {
        result.current.increment();
      });
    }
    expect(result.current.count).toBe(5);
  });
});
