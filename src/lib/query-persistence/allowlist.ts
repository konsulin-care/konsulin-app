import type { Query } from '@tanstack/react-query';

/** Maximum age of a persisted query cache, in milliseconds (24 hours). */
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

/** Cache buster string; bumping it discards previously persisted state. */
export const CACHE_BUSTER = 'v1';

/**
 * Query key roots whose successful queries may be persisted.
 *
 * The `research` root is handled separately because only the four-part
 * progress key shape is allowed; the bare `['research']` ongoing-studies
 * key must stay in memory.
 */
const PERSISTED_KEY_ROOTS: ReadonlySet<string> = new Set([
  'study-participant-count',
  'per-questionnaire-counts',
  'questionnaire-titles'
]);

/**
 * Checks whether a query key belongs to the persistence allowlist.
 *
 * Allowed shapes are `['study-participant-count', ...]`,
 * `['per-questionnaire-counts', ...]`, `['questionnaire-titles', ...]`, and
 * `['research', kind, id, mode]` (exactly four entries).
 *
 * @param key - The query key to inspect.
 * @returns True when the key is allowlisted.
 */
export function isPersistedQueryKey(key: readonly unknown[]): boolean {
  const root = key[0];

  if (typeof root !== 'string') return false;
  if (root === 'research') return key.length === 4;

  return PERSISTED_KEY_ROOTS.has(root);
}

/**
 * Decides whether a successful query is dehydrated into persisted state.
 *
 * @param query - The query TanStack Query is considering for dehydration.
 * @returns True when the key is allowlisted and the query succeeded.
 */
export function shouldDehydrateQuery(query: Query): boolean {
  return (
    query.state.status === 'success' && isPersistedQueryKey(query.queryKey)
  );
}

/**
 * Decides whether a mutation is dehydrated into persisted state.
 *
 * Mutations are never persisted.
 *
 * @returns Always false.
 */
export function shouldDehydrateMutation(): false {
  return false;
}
