import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from '../useMediaQuery';

type ChangeListener = (event: { matches: boolean }) => void;

/** Stub matchMedia with query → matches state and subscribable change events. */
function stubMatchMedia(initial: Map<string, boolean>) {
  const matches = new Map(initial);
  const listeners = new Map<string, Set<ChangeListener>>();

  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return matches.get(query) ?? false;
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_type: string, listener: ChangeListener) => {
      const set = listeners.get(query) ?? new Set();
      set.add(listener);
      listeners.set(query, set);
    },
    removeEventListener: (_type: string, listener: ChangeListener) => {
      listeners.get(query)?.delete(listener);
    },
    dispatchEvent: vi.fn()
  }));

  /** Flip one query's result and notify subscribers, like the browser. */
  const setMatches = (query: string, value: boolean) => {
    matches.set(query, value);
    for (const listener of listeners.get(query) ?? []) {
      listener({ matches: value });
    }
  };

  return { setMatches };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('returns false when the query does not match', () => {
    stubMatchMedia(new Map([['(max-width: 640px)', false]]));
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'));
    expect(result.current).toBe(false);
  });

  it('returns true when the query matches', () => {
    stubMatchMedia(new Map([['(max-width: 640px)', true]]));
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query result changes', () => {
    const { setMatches } = stubMatchMedia(
      new Map([['(max-width: 640px)', false]])
    );
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'));
    expect(result.current).toBe(false);

    act(() => {
      setMatches('(max-width: 640px)', true);
    });
    expect(result.current).toBe(true);
  });

  it('unsubscribes when the hook unmounts', () => {
    const { setMatches } = stubMatchMedia(
      new Map([['(max-width: 640px)', false]])
    );
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 640px)'));
    unmount();

    expect(() => {
      act(() => {
        setMatches('(max-width: 640px)', true);
      });
    }).not.toThrow();
  });
});
