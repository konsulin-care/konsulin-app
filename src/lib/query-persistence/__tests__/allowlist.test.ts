import { QueryClient, dehydrate, onlineManager } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  CACHE_BUSTER,
  PERSIST_MAX_AGE,
  isPersistedQueryKey,
  shouldDehydrateMutation,
  shouldDehydrateQuery
} from '../allowlist';

/**
 * Seeds a client with successful query data for the given key.
 *
 * @param client - The query client to seed.
 * @param queryKey - The key to store data under.
 * @param data - The data to store.
 */
function seedSuccess(
  client: QueryClient,
  queryKey: readonly unknown[],
  data: unknown
): void {
  client.setQueryData(queryKey, data);
}

/**
 * Dehydrates a client using the persistence allowlist.
 *
 * @param client - The query client to dehydrate.
 * @returns The dehydrated state.
 */
function dehydrateAllowlisted(
  client: QueryClient
): ReturnType<typeof dehydrate> {
  return dehydrate(client, {
    shouldDehydrateQuery,
    shouldDehydrateMutation
  });
}

/**
 * Lists dehydrated query keys as JSON strings for easy assertions.
 *
 * @param client - The query client to dehydrate.
 * @returns The dehydrated query keys.
 */
function dehydratedKeys(client: QueryClient): string[] {
  return dehydrateAllowlisted(client).queries.map(query =>
    JSON.stringify(query.queryKey)
  );
}

describe('query persistence allowlist', () => {
  it('exposes the 24 hour max age and a cache buster', () => {
    expect(PERSIST_MAX_AGE).toBe(24 * 60 * 60 * 1000);
    expect(typeof CACHE_BUSTER).toBe('string');
    expect(CACHE_BUSTER.length).toBeGreaterThan(0);
  });

  it('accepts the five allowlisted key shapes', () => {
    expect(isPersistedQueryKey(['study-participant-count', 's1'])).toBe(true);
    expect(isPersistedQueryKey(['per-questionnaire-counts', 'r1', 'q1'])).toBe(
      true
    );
    expect(isPersistedQueryKey(['questionnaire-titles'])).toBe(true);
    expect(isPersistedQueryKey(['report-responses', 'patient', 'pat-1'])).toBe(
      true
    );
    expect(isPersistedQueryKey(['research', 'patient', 'id', 'batch'])).toBe(
      true
    );
  });

  it('rejects the bare research key and other shapes', () => {
    expect(isPersistedQueryKey(['research'])).toBe(false);
    expect(isPersistedQueryKey(['research', 'patient', 'id'])).toBe(false);
    expect(isPersistedQueryKey(['assessments', 'q1'])).toBe(false);
    expect(isPersistedQueryKey(['questionnaire-response', 'q1'])).toBe(false);
    expect(isPersistedQueryKey([])).toBe(false);
    expect(isPersistedQueryKey([42])).toBe(false);
  });

  it('keeps successful allowlisted queries during dehydrate', () => {
    const client = new QueryClient();

    seedSuccess(client, ['study-participant-count', 's1'], { s1: 12 });
    seedSuccess(client, ['per-questionnaire-counts', 'r1', 'q1'], new Map());
    seedSuccess(client, ['questionnaire-titles'], ['Title A']);
    seedSuccess(client, ['report-responses', 'patient', 'pat-1'], []);
    seedSuccess(client, ['research', 'patient', 'id', 'batch'], { ok: true });

    expect(dehydratedKeys(client).sort()).toEqual(
      [
        '["study-participant-count","s1"]',
        '["per-questionnaire-counts","r1","q1"]',
        '["questionnaire-titles"]',
        '["report-responses","patient","pat-1"]',
        '["research","patient","id","batch"]'
      ].sort()
    );
  });

  it('drops the bare research key, assessments, questionnaires and non-success queries', () => {
    const client = new QueryClient();

    seedSuccess(client, ['research'], { studies: [] });
    seedSuccess(client, ['assessments', 'q1'], { data: 'response' });
    seedSuccess(client, ['QuestionnaireResponse', 'qr1'], {
      resourceType: 'QuestionnaireResponse'
    });
    seedSuccess(client, ['study-participant-count', 's1'], { s1: 3 });

    const pending = client.getQueryCache().build(client, {
      queryKey: ['questionnaire-titles'],
      queryFn: () => new Promise(() => undefined)
    });
    expect(pending.state.status).toBe('pending');

    expect(dehydratedKeys(client)).toEqual([
      JSON.stringify(['study-participant-count', 's1'])
    ]);
  });

  it('drops all mutations including paused ones', async () => {
    const client = new QueryClient();
    seedSuccess(client, ['questionnaire-titles'], ['Title A']);

    onlineManager.setOnline(false);
    try {
      const mutation = client.getMutationCache().build(client, {
        mutationKey: ['submit-response'],
        mutationFn: () => new Promise(() => undefined)
      });
      void mutation.execute(undefined);
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mutation.state.isPaused).toBe(true);
      expect(mutation.state.status).toBe('pending');
      expect(shouldDehydrateMutation()).toBe(false);
      expect(dehydrateAllowlisted(client).mutations).toEqual([]);
    } finally {
      onlineManager.setOnline(true);
    }
  });
});
