import { vi } from 'vitest';

/**
 * Create navigation mocks for Next.js router and URL.
 * @param pathname - Default pathname
 * @param searchParams - Default search params string
 */
export function createNavigationMocks(pathname = '/', searchParams = '') {
  const push = vi.fn();
  const replace = vi.fn();
  const back = vi.fn();

  return {
    push,
    replace,
    back,
    router: {
      push,
      replace,
      back,
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn()
    },
    pathname,
    searchParams: new URLSearchParams(searchParams)
  };
}
