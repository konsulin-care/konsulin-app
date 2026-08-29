'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef } from 'react';

let appQueryClient: QueryClient | null = null;

/** Returns the app-wide QueryClient, or null before the provider mounts. */
export function getAppQueryClient(): QueryClient | null {
  return appQueryClient;
}

/**
 *
 */
export default function QueryProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const queryClientRef = useRef<QueryClient | null>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: 0
        }
      }
    });
    appQueryClient = queryClientRef.current;
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      {children}
    </QueryClientProvider>
  );
}
