import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScrollIndicator } from '../scroll-indicator';

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

beforeEach(() => {
  vi.useFakeTimers();
  stubGeometry({ innerHeight: 1000, scrollHeight: 3000, scrollY: 0 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ScrollIndicator', () => {
  it('renders nothing when the page does not overflow', () => {
    stubGeometry({ innerHeight: 1000, scrollHeight: 900, scrollY: 0 });
    render(<ScrollIndicator />);
    expect(screen.queryByTestId('scroll-indicator')).not.toBeInTheDocument();
  });

  it('renders a 3px aria-hidden non-interactive thumb when overflowing', () => {
    render(<ScrollIndicator />);
    const thumb = screen.getByTestId('scroll-indicator');

    expect(thumb).toHaveAttribute('aria-hidden', 'true');
    expect(thumb).toHaveClass('fixed');
    expect(thumb).toHaveClass('right-0.5');
    expect(thumb).toHaveClass('z-50');
    expect(thumb).toHaveClass('w-[3px]');
    expect(thumb).toHaveClass('rounded-full');
    expect(thumb).toHaveClass('bg-charcoal-400/50');
    expect(thumb).toHaveClass('pointer-events-none');
    expect(thumb).toHaveClass('opacity-0');
  });

  it('shows the thumb while scrolling and hides it after 800ms', () => {
    render(<ScrollIndicator />);
    expect(screen.getByTestId('scroll-indicator')).toHaveAttribute(
      'data-visible',
      'false'
    );

    act(() => {
      Object.defineProperty(window, 'scrollY', {
        configurable: true,
        writable: true,
        value: 1000
      });
      window.dispatchEvent(new Event('scroll'));
    });

    const thumb = screen.getByTestId('scroll-indicator');
    expect(thumb).toHaveAttribute('data-visible', 'true');
    expect(thumb).toHaveClass('opacity-100');

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(screen.getByTestId('scroll-indicator')).toHaveAttribute(
      'data-visible',
      'false'
    );
    expect(screen.getByTestId('scroll-indicator')).toHaveClass('opacity-0');
  });

  it('positions the thumb with inline top and height', () => {
    render(<ScrollIndicator />);
    const thumb = screen.getByTestId('scroll-indicator');
    const expectedHeight = (1000 * 1000) / 3000;

    expect(thumb.style.height).toBe(`${expectedHeight}px`);
    expect(thumb.style.top).toBe('0px');
    expect(thumb).toHaveClass('transition-opacity');
    expect(thumb).toHaveClass('motion-reduce:transition-none');
  });
});
