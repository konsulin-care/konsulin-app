'use client';

import { useCallback, useEffect, useState } from 'react';

/** Tolerance in pixels so sub-pixel rounding does not report a false edge. */
const EDGE_TOLERANCE = 1;

/** String flag used by the fade attributes. */
type FadeFlag = 'true' | 'false';

/** Attributes spread onto a scroll container to drive CSS edge fades. */
export interface ScrollEdgeAttributes {
  /** Marks the element as a fade-aware scroll container. */
  'data-scroll-fade': '';
  /** True when content is hidden above the visible area. */
  'data-fade-top': FadeFlag;
  /** True when content is hidden below the visible area. */
  'data-fade-bottom': FadeFlag;
  /** True when content is hidden to the left of the visible area. */
  'data-fade-left': FadeFlag;
  /** True when content is hidden to the right of the visible area. */
  'data-fade-right': FadeFlag;
}

/** Scroll edge flags without the marker attribute. */
type ScrollEdges = Omit<ScrollEdgeAttributes, 'data-scroll-fade'>;

const NO_EDGES: ScrollEdges = {
  'data-fade-top': 'false',
  'data-fade-bottom': 'false',
  'data-fade-left': 'false',
  'data-fade-right': 'false'
};

/** Cleanup returned when the effect has nothing to detach. */
const NO_CLEANUP = (): void => {};

/**
 * Convert a boolean into the string flag used by the fade attributes.
 *
 * @param value - Condition to convert
 * @returns Either `'true'` or `'false'`
 */
function toFlag(value: boolean): FadeFlag {
  return value ? 'true' : 'false';
}

/**
 * Derive the scroll edge flags from an element's current geometry.
 *
 * @param node - Scroll container to measure
 * @returns The fade flags for all four edges
 */
function readEdges(node: HTMLElement): ScrollEdges {
  const { scrollTop, clientHeight, scrollHeight } = node;
  const { scrollLeft, clientWidth, scrollWidth } = node;

  return {
    'data-fade-top': toFlag(scrollTop > 0),
    'data-fade-bottom': toFlag(
      scrollTop + clientHeight < scrollHeight - EDGE_TOLERANCE
    ),
    'data-fade-left': toFlag(scrollLeft > 0),
    'data-fade-right': toFlag(
      scrollLeft + clientWidth < scrollWidth - EDGE_TOLERANCE
    )
  };
}

/**
 * Compare two edge states by value.
 *
 * @param left - First edge state
 * @param right - Second edge state
 * @returns True when every flag matches
 */
function isSameEdges(left: ScrollEdges, right: ScrollEdges): boolean {
  return (
    left['data-fade-top'] === right['data-fade-top'] &&
    left['data-fade-bottom'] === right['data-fade-bottom'] &&
    left['data-fade-left'] === right['data-fade-left'] &&
    left['data-fade-right'] === right['data-fade-right']
  );
}

/**
 * Track the scroll edges of a container and expose them as data attributes.
 *
 * The returned `ref` must be attached to the scroll container. On mount and on
 * every scroll or resize the hook recomputes whether content overflows past
 * each edge. Spread `attributes` onto the same element so CSS can render fades.
 *
 * @typeParam T - HTML element type of the scroll container
 * @returns The callback ref and the fade attributes
 */
export function useScrollEdges<T extends HTMLElement = HTMLDivElement>(): {
  ref: (node: T | null) => void;
  attributes: ScrollEdgeAttributes;
} {
  const [node, setNode] = useState<T | null>(null);
  const [edges, setEdges] = useState<ScrollEdges>(NO_EDGES);

  const ref = useCallback((next: T | null) => {
    setNode(next);
  }, []);

  useEffect(() => {
    if (node === null) {
      setEdges(NO_EDGES);
      return NO_CLEANUP;
    }

    /** Recompute the edges from the current node geometry. */
    const measure = () => {
      const next = readEdges(node);
      setEdges(previous => (isSameEdges(previous, next) ? previous : next));
    };

    measure();
    node.addEventListener('scroll', measure, { passive: true });

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => measure());
    observer?.observe(node);

    return () => {
      node.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [node]);

  return {
    ref,
    attributes: { 'data-scroll-fade': '', ...edges }
  };
}
