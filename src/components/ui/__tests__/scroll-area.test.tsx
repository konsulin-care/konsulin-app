import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScrollArea } from '../scroll-area';

/** Geometry stubbed onto the scroll viewport. */
interface Box {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
}

/**
 * Override the read-only geometry properties of the viewport.
 *
 * @param node - Viewport element to stub
 * @param box - Geometry values to apply
 */
function stubBox(node: HTMLElement, box: Box): void {
  for (const [key, value] of Object.entries(box)) {
    Object.defineProperty(node, key, {
      configurable: true,
      writable: true,
      value
    });
  }
}

/**
 * Render a ScrollArea and return its viewport element.
 *
 * @param box - Geometry stubbed onto the viewport
 * @returns The rendered viewport
 */
function renderViewport(box: Box): HTMLElement {
  const { container } = render(
    <ScrollArea className='h-40'>
      <div style={{ height: 800 }}>content</div>
    </ScrollArea>
  );
  const viewport = container.querySelector<HTMLElement>(
    '[data-radix-scroll-area-viewport]'
  );
  if (viewport === null) {
    throw new Error('scroll area viewport not rendered');
  }
  stubBox(viewport, box);
  act(() => {
    viewport.dispatchEvent(new Event('scroll'));
  });
  return viewport;
}

describe('ScrollArea', () => {
  it('marks the viewport as a fade-aware scroll container', () => {
    const viewport = renderViewport({
      scrollTop: 0,
      clientHeight: 200,
      scrollHeight: 800,
      scrollLeft: 0,
      clientWidth: 200,
      scrollWidth: 200
    });

    expect(viewport).toHaveAttribute('data-scroll-fade', '');
    expect(viewport).toHaveAttribute('data-fade-top', 'false');
    expect(viewport).toHaveAttribute('data-fade-bottom', 'true');
  });

  it('updates the fade attributes when the viewport scrolls', () => {
    const viewport = renderViewport({
      scrollTop: 0,
      clientHeight: 200,
      scrollHeight: 800,
      scrollLeft: 0,
      clientWidth: 200,
      scrollWidth: 200
    });

    act(() => {
      Object.defineProperty(viewport, 'scrollTop', {
        configurable: true,
        writable: true,
        value: 300
      });
      viewport.dispatchEvent(new Event('scroll'));
    });

    expect(viewport).toHaveAttribute('data-fade-top', 'true');
    expect(viewport).toHaveAttribute('data-fade-bottom', 'true');

    act(() => {
      Object.defineProperty(viewport, 'scrollTop', {
        configurable: true,
        writable: true,
        value: 600
      });
      viewport.dispatchEvent(new Event('scroll'));
    });

    expect(viewport).toHaveAttribute('data-fade-bottom', 'false');
  });

  it('renders a thin scrollbar track', () => {
    const { container } = render(
      <ScrollArea type='always' className='h-40'>
        <div>content</div>
      </ScrollArea>
    );
    const scrollbar = container.querySelector<HTMLElement>('.w-\\[3px\\]');

    expect(scrollbar).not.toBeNull();
  });
});
