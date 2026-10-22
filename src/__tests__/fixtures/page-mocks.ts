/**
 * Shared test data for page-level tests.
 *
 * Provides reusable mock data and setup helpers.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

/** Create a QueryClient for tests. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

/** Create a wrapper function with QueryClientProvider. */
export function createTestWrapper() {
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}
