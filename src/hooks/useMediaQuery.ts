'use client';

import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query and report whether it currently matches.
 *
 * SSR-safe: returns `false` on the server and on the first client render;
 * the live value arrives in a `useEffect`. Re-subscribes whenever the
 * `query` argument changes.
 *
 * @param query - CSS media query, e.g. `'(max-width: 640px)'`.
 * @returns `true` when the query matches the current viewport.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    /** Forward media-query changes to the matches state. */
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
