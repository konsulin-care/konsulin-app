import { act, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useScrollHide } from '../use-scroll-hide';

/**
 * Test component that mirrors how QuickActionFab uses the hook:
 * isInteractive starts false, flips to true on button click.
 */
function TestHarness() {
  const [isInteractive, setIsInteractive] = useState(false);
  const isVisible = useScrollHide(isInteractive);
  return (
    <div>
      <span data-testid='visible'>{isVisible ? 'true' : 'false'}</span>
      <span data-testid='interactive'>{isInteractive ? 'true' : 'false'}</span>
      <button
        data-testid='make-interactive'
        onClick={() => setIsInteractive(true)}
      >
        Make Interactive
      </button>
    </div>
  );
}

describe('useScrollHide', () => {
  beforeEach(() => {
    // Reset scroll position before each test
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  it('starts visible', () => {
    const { result } = renderHook(() => useScrollHide(false));
    expect(result.current).toBe(true);
  });

  it('hides on scroll down past threshold', () => {
    render(<TestHarness />);
    expect(screen.getByTestId('visible').textContent).toBe('true');

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 200, writable: true });
      window.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    expect(screen.getByTestId('visible').textContent).toBe('false');
  });

  it('reappears when isInteractive transitions to true after being hidden', () => {
    render(<TestHarness />);
    expect(screen.getByTestId('visible').textContent).toBe('true');

    // Scroll down to hide
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 200, writable: true });
      window.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    expect(screen.getByTestId('visible').textContent).toBe('false');

    // Make interactive — should reappear
    act(() => {
      screen.getByTestId('make-interactive').click();
    });
    expect(screen.getByTestId('visible').textContent).toBe('true');
  });

  it('stays visible when isInteractive is true from the start', () => {
    const { result } = renderHook(() => useScrollHide(true));
    expect(result.current).toBe(true);
  });
});
