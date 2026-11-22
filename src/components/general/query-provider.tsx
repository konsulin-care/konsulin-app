'use client';

import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useRef } from 'react';

import {
  CACHE_BUSTER,
  PERSIST_MAX_AGE,
  shouldDehydrateMutation,
  shouldDehydrateQuery
} from '@/lib/query-persistence/allowlist';
import { queryPersister } from '@/lib/query-persistence/persister';

let appQueryClient: QueryClient | null = null;

/** Returns the app-wide QueryClient, or null before the provider mounts. */
export function getAppQueryClient(): QueryClient | null {
  return appQueryClient;
}

/**
 * Provides the app-wide QueryClient and restores its allowlisted state from
 * IndexedDB.
 *
 * @param props - Component props.
 * @param props.children - The application tree.
 * @returns The persistence-aware query provider wrapping the children.
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
          retry: 0,
          gcTime: PERSIST_MAX_AGE
        }
      }
    });
    appQueryClient = queryClientRef.current;
  }

  return (
    <PersistQueryClientProvider
      client={queryClientRef.current}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE,
        buster: CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery,
          shouldDehydrateMutation
        }
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
