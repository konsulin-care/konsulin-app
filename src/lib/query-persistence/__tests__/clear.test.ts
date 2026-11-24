import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { clear, getAppQueryClient, removeClient } = vi.hoisted(() => ({
  clear: vi.fn(),
  getAppQueryClient: vi.fn(),
  removeClient: vi.fn()
}));

vi.mock('@/components/general/query-provider', () => ({
  getAppQueryClient: (...args: unknown[]) => getAppQueryClient(...args)
}));

vi.mock('@/lib/query-persistence/persister', () => ({
  queryPersister: {
    removeClient: (...args: unknown[]) => removeClient(...args)
  }
}));

import { clearQueryCache, pruneForeignResearchQueries } from '../clear';

/**
 * Seeds a successful query into the client for the given key.
 *
 * @param client - The client to seed.
 * @param queryKey - The key to store data under.
 */
function seed(client: QueryClient, queryKey: readonly unknown[]): void {
  client.setQueryData(queryKey, { ok: true });
}

/**
 * Lists the client's query keys as JSON strings.
 *
 * @param client - The client to inspect.
 * @returns The current query keys.
 */
function keys(client: QueryClient): string[] {
  return client
    .getQueryCache()
    .getAll()
    .map(query => JSON.stringify(query.queryKey))
    .sort();
}

describe('clearQueryCache', () => {
  beforeEach(() => {
    clear.mockReset();
    getAppQueryClient.mockReset();
    removeClient.mockReset();
    removeClient.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clears the in-memory cache and removes the persisted record', async () => {
    getAppQueryClient.mockReturnValue({ clear });

    await clearQueryCache();

    expect(clear).toHaveBeenCalledTimes(1);
    expect(removeClient).toHaveBeenCalledTimes(1);
  });

  it('still removes the persisted record when no client is mounted', async () => {
    getAppQueryClient.mockReturnValue(null);

    await clearQueryCache();

    expect(clear).not.toHaveBeenCalled();
    expect(removeClient).toHaveBeenCalledTimes(1);
  });
});

describe('pruneForeignResearchQueries', () => {
  it('removes research progress queries of other identities', () => {
    const client = new QueryClient();
    seed(client, ['research', 'guest', 'guest-1', 'batch']);
    seed(client, ['research', 'patient', 'other', 'batch']);
    seed(client, ['research', 'patient', 'p1', 'batch']);

    pruneForeignResearchQueries(client, { kind: 'patient', id: 'p1' });

    expect(keys(client)).toEqual([
      JSON.stringify(['research', 'patient', 'p1', 'batch'])
    ]);
  });

  it('removes report response queries of other identities', () => {
    const client = new QueryClient();
    seed(client, ['report-responses', 'guest', 'local', ['q1'], null, null]);
    seed(client, ['report-responses', 'patient', 'other', ['q1'], null, null]);
    seed(client, ['report-responses', 'patient', 'p1', ['q1'], null, null]);

    pruneForeignResearchQueries(client, { kind: 'patient', id: 'p1' });

    expect(keys(client)).toEqual([
      JSON.stringify(['report-responses', 'patient', 'p1', ['q1'], null, null])
    ]);
  });

  it('keeps only guest local report responses for a guest identity', () => {
    const client = new QueryClient();
    seed(client, ['report-responses', 'guest', 'local', ['q1'], null, null]);
    seed(client, ['report-responses', 'patient', 'p1', ['q1'], null, null]);

    pruneForeignResearchQueries(client, { kind: 'guest', id: 'local' });

    expect(keys(client)).toEqual([
      JSON.stringify(['report-responses', 'guest', 'local', ['q1'], null, null])
    ]);
  });

  it('keeps the exact research key and count and title queries', () => {
    const client = new QueryClient();
    seed(client, ['research']);
    seed(client, ['study-participant-count', 's1']);
    seed(client, ['per-questionnaire-counts', 'r1', 'q1']);
    seed(client, ['questionnaire-titles']);
    seed(client, ['research', 'guest', 'guest-1', 'batch']);

    pruneForeignResearchQueries(client, { kind: 'patient', id: 'p1' });

    expect(keys(client)).toEqual(
      [
        JSON.stringify(['research']),
        JSON.stringify(['study-participant-count', 's1']),
        JSON.stringify(['per-questionnaire-counts', 'r1', 'q1']),
        JSON.stringify(['questionnaire-titles'])
      ].sort()
    );
  });
});
