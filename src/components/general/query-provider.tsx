'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef } from 'react';

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
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      {children}
    </QueryClientProvider>
  );
}
