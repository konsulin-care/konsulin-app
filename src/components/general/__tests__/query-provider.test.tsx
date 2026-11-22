import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbGet, dbSet, dbDelete } = vi.hoisted(() => ({
  dbGet: vi.fn(),
  dbSet: vi.fn(),
  dbDelete: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { queryCache: 'query_cache' },
  dbGet: (...args: unknown[]) => dbGet(...args),
  dbSet: (...args: unknown[]) => dbSet(...args),
  dbDelete: (...args: unknown[]) => dbDelete(...args)
}));

import {
  CACHE_BUSTER,
  PERSIST_MAX_AGE
} from '@/lib/query-persistence/allowlist';
import QueryProvider, { getAppQueryClient } from '../query-provider';

const PERSISTED_TITLES = ['Questionnaire A', 'Questionnaire B'];

/**
 * Builds a persisted client holding a successful allowlisted query.
 *
 * @returns A persisted client with one fresh title query.
 */
function makePersistedRecord(): { key: string; client: PersistedClient } {
  const now = Date.now();

  return {
    key: 'tanstack-query',
    client: {
      timestamp: now,
      buster: CACHE_BUSTER,
      clientState: {
        mutations: [],
        queries: [
          {
            queryKey: ['questionnaire-titles', 'study-1'],
            queryHash: '["questionnaire-titles","study-1"]',
            dehydratedAt: now,
            state: {
              data: PERSISTED_TITLES,
              dataUpdatedAt: now,
              dataUpdateCount: 1,
              error: null,
              errorUpdatedAt: 0,
              errorUpdateCount: 0,
              fetchFailureCount: 0,
              fetchFailureReason: null,
              fetchMeta: null,
              isInvalidated: false,
              status: 'success',
              fetchStatus: 'idle'
            }
          }
        ]
      }
    }
  };
}

describe('QueryProvider', () => {
  beforeEach(() => {
    dbGet.mockReset();
    dbSet.mockReset();
    dbDelete.mockReset();
    dbGet.mockResolvedValue(null);
    dbSet.mockResolvedValue(undefined);
    dbDelete.mockResolvedValue(undefined);
  });

  it('renders a fresh persisted allowlisted query without calling its queryFn', async () => {
    dbGet.mockResolvedValue(makePersistedRecord());
    const queryFn = vi.fn(() => Promise.resolve(['network']));

    function TitlesProbe() {
      const { data } = useQuery({
        queryKey: ['questionnaire-titles', 'study-1'],
        queryFn,
        staleTime: Number.POSITIVE_INFINITY
      });

      return <span data-testid='titles'>{data?.join(', ') ?? 'loading'}</span>;
    }

    render(
      <QueryProvider>
        <TitlesProbe />
      </QueryProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('titles')).toHaveTextContent(
        'Questionnaire A, Questionnaire B'
      );
    });
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('uses a default gcTime of 24 hours', () => {
    render(
      <QueryProvider>
        <span>child</span>
      </QueryProvider>
    );

    const client = getAppQueryClient();

    expect(client?.getDefaultOptions().queries?.gcTime).toBe(PERSIST_MAX_AGE);
    expect(PERSIST_MAX_AGE).toBe(24 * 60 * 60 * 1000);
  });

  it('returns the provider client from getAppQueryClient after mount', () => {
    const seen: { client: ReturnType<typeof useQueryClient> | null } = {
      client: null
    };

    function ClientProbe() {
      seen.client = useQueryClient();

      return <span data-testid='client'>mounted</span>;
    }

    render(
      <QueryProvider>
        <ClientProbe />
      </QueryProvider>
    );

    expect(screen.getByTestId('client')).toBeInTheDocument();
    expect(getAppQueryClient()).not.toBeNull();
    expect(getAppQueryClient()).toBe(seen.client);
  });
});
