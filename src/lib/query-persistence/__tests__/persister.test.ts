import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { createQueryPersister } from '../persister';

/**
 * Builds a persisted client carrying the supplied query data.
 *
 * @param data - The query data to dehydrate.
 * @param timestamp - The persisted timestamp.
 * @returns A minimal persisted client.
 */
function makeClient(data: unknown, timestamp = 1): PersistedClient {
  return {
    timestamp,
    buster: 'test-buster',
    clientState: {
      mutations: [],
      queries: [
        {
          queryKey: ['per-questionnaire-counts', 'r1', 'q1'],
          queryHash: '["per-questionnaire-counts","r1","q1"]',
          dehydratedAt: timestamp,
          state: {
            data,
            dataUpdatedAt: timestamp,
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
  };
}

/**
 * Builds a persisted client with no queries and no mutations.
 *
 * @returns An empty persisted client.
 */
function makeEmptyClient(): PersistedClient {
  return {
    timestamp: 1,
    buster: 'test-buster',
    clientState: { mutations: [], queries: [] }
  };
}

describe('createQueryPersister', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    dbGet.mockReset();
    dbSet.mockReset();
    dbDelete.mockReset();
    dbGet.mockResolvedValue(null);
    dbSet.mockResolvedValue(undefined);
    dbDelete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips a Map in query data through structured clone', async () => {
    const data = {
      counts: new Map([
        ['completed', 3],
        ['total', 8]
      ])
    };
    const client = makeClient(data);
    dbGet.mockResolvedValue({ key: 'tanstack-query', client });

    const persister = createQueryPersister();
    const restored = await persister.restoreClient();

    expect(restored).toEqual(client);
    const restoredData = restored?.clientState.queries[0]?.state.data as {
      counts: Map<string, number>;
    };
    expect(restoredData.counts).toBeInstanceOf(Map);
    expect([...restoredData.counts.entries()]).toEqual([
      ['completed', 3],
      ['total', 8]
    ]);
  });

  it('writes only once for several calls within 1000 ms, keeping the latest client', async () => {
    const persister = createQueryPersister();
    const first = makeClient({ value: 'first' }, 1);
    const latest = makeClient({ value: 'latest' }, 2);

    persister.persistClient(first);
    vi.advanceTimersByTime(400);
    persister.persistClient(latest);

    expect(dbSet).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(600);

    expect(dbSet).toHaveBeenCalledTimes(1);
    expect(dbSet).toHaveBeenCalledWith('query_cache', {
      key: 'tanstack-query',
      client: latest
    });
  });

  it('deletes the record when persisting an empty client', async () => {
    const persister = createQueryPersister();

    persister.persistClient(makeEmptyClient());
    await vi.advanceTimersByTimeAsync(1000);

    expect(dbSet).not.toHaveBeenCalled();
    expect(dbDelete).toHaveBeenCalledWith('query_cache', 'tanstack-query');
  });

  it('removeClient cancels a pending write and deletes the record', async () => {
    const persister = createQueryPersister();

    persister.persistClient(makeClient({ value: 'pending' }));
    await persister.removeClient();

    expect(dbDelete).toHaveBeenCalledTimes(1);
    expect(dbDelete).toHaveBeenCalledWith('query_cache', 'tanstack-query');

    await vi.advanceTimersByTimeAsync(2000);

    expect(dbSet).not.toHaveBeenCalled();
  });
});
