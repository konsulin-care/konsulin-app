import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactElement, type ReactNode } from 'react';

/** QueryClient with retries disabled for render tests. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

/** QueryClientProvider wrapper built with createElement for plain .ts usage. */
export function createWrapper(): (props: {
  children: ReactNode;
}) => ReactElement {
  const queryClient = createQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}
