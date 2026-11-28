import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useScrollEdges } from '../useScrollEdges';

/** Geometry stubbed onto a scroll container. */
interface Box {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
}

/**
 * Override the read-only geometry properties of a scroll container.
 *
 * @param node - Element to stub
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
 * Update the scroll offsets of a container and dispatch a scroll event.
 *
 * @param node - Element to scroll
 * @param offsets - New scrollTop and scrollLeft values
 */
function scroll(
  node: HTMLElement,
  offsets: { scrollTop?: number; scrollLeft?: number }
): void {
  if (offsets.scrollTop !== undefined) {
    Object.defineProperty(node, 'scrollTop', {
      configurable: true,
      writable: true,
      value: offsets.scrollTop
    });
  }
  if (offsets.scrollLeft !== undefined) {
    Object.defineProperty(node, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: offsets.scrollLeft
    });
  }
  node.dispatchEvent(new Event('scroll'));
}

/**
 * Render the hook and attach its ref to a detached container.
 *
 * @param box - Initial geometry of the container
 * @returns The attached node and the rendered hook result
 */
function mount(box: Box) {
  const node = document.createElement('div');
  stubBox(node, box);
  const { result } = renderHook(() => useScrollEdges<HTMLDivElement>());

  act(() => {
    result.current.ref(node);
  });

  return { node, result };
}

describe('useScrollEdges', () => {
  it('follows the vertical edges while scrolling', () => {
    const { node, result } = mount({
      scrollTop: 0,
      clientHeight: 100,
      scrollHeight: 300,
      scrollLeft: 0,
      clientWidth: 100,
      scrollWidth: 100
    });

    expect(result.current.attributes['data-scroll-fade']).toBe('');
    expect(result.current.attributes['data-fade-top']).toBe('false');
    expect(result.current.attributes['data-fade-bottom']).toBe('true');

    act(() => {
      scroll(node, { scrollTop: 100 });
    });
    expect(result.current.attributes['data-fade-top']).toBe('true');
    expect(result.current.attributes['data-fade-bottom']).toBe('true');

    act(() => {
      scroll(node, { scrollTop: 200 });
    });
    expect(result.current.attributes['data-fade-top']).toBe('true');
    expect(result.current.attributes['data-fade-bottom']).toBe('false');
  });

  it('follows the horizontal edges while scrolling', () => {
    const { node, result } = mount({
      scrollTop: 0,
      clientHeight: 100,
      scrollHeight: 100,
      scrollLeft: 0,
      clientWidth: 100,
      scrollWidth: 300
    });

    expect(result.current.attributes['data-fade-left']).toBe('false');
    expect(result.current.attributes['data-fade-right']).toBe('true');

    act(() => {
      scroll(node, { scrollLeft: 100 });
    });
    expect(result.current.attributes['data-fade-left']).toBe('true');
    expect(result.current.attributes['data-fade-right']).toBe('true');

    act(() => {
      scroll(node, { scrollLeft: 200 });
    });
    expect(result.current.attributes['data-fade-left']).toBe('true');
    expect(result.current.attributes['data-fade-right']).toBe('false');
  });

  it('reports no edges before a node is attached', () => {
    const { result } = renderHook(() => useScrollEdges<HTMLDivElement>());

    expect(result.current.attributes).toEqual({
      'data-scroll-fade': '',
      'data-fade-top': 'false',
      'data-fade-bottom': 'false',
      'data-fade-left': 'false',
      'data-fade-right': 'false'
    });
  });
});
