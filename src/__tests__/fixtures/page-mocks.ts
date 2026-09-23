/**
 * Shared test data for page-level tests.
 *
 * Provides reusable mock data and setup helpers.
 */

/** Create a QueryClient for tests. */
export function createTestQueryClient() {
  const { QueryClient } = require('@tanstack/react-query');
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

/** Create a wrapper function with QueryClientProvider. */
export function createTestWrapper() {
  const { createElement } = require('react');
  const { QueryClientProvider } = require('@tanstack/react-query');
  const queryClient = createTestQueryClient();

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}
