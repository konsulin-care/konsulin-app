import type { QueryClient } from '@tanstack/react-query';

import { getAppQueryClient } from '@/components/general/query-provider';
import { queryPersister } from '@/lib/query-persistence/persister';

/** Identity a research progress query belongs to. */
export interface ResearchIdentity {
  kind: string;
  id: string;
}

/**
 * Checks whether a query key is a four-part research progress key.
 *
 * @param key - The query key to inspect.
 * @returns True when the key is `['research', kind, id, mode]`.
 */
function isResearchProgressKey(key: readonly unknown[]): boolean {
  return key.length === 4 && key[0] === 'research';
}

/**
 * Checks whether a research progress key matches the given identity.
 *
 * @param key - The query key to inspect.
 * @param identity - The current identity.
 * @returns True when the key belongs to the current identity.
 */
function matchesIdentity(
  key: readonly unknown[],
  identity: ResearchIdentity
): boolean {
  return key[1] === identity.kind && key[2] === identity.id;
}

/**
 * Checks whether a query key is a report-responses key.
 *
 * The key shape is `['report-responses', kind, id, ...rest]`.
 *
 * @param key - The query key to inspect.
 * @returns True when the key starts the report-responses key.
 */
function isReportResponsesKey(key: readonly unknown[]): boolean {
  return key.length >= 3 && key[0] === 'report-responses';
}

/**
 * Checks whether a report-responses key matches the given identity.
 *
 * Guests store report responses under the fixed local id `'local'`, while
 * patients use their FHIR id.
 *
 * @param key - The query key to inspect.
 * @param identity - The current identity.
 * @returns True when the key belongs to the current identity.
 */
function matchesReportIdentity(
  key: readonly unknown[],
  identity: ResearchIdentity
): boolean {
  const expectedId = identity.kind === 'guest' ? 'local' : identity.id;
  return key[1] === identity.kind && key[2] === expectedId;
}

/**
 * Removes research progress and report response queries that belong to a
 * different identity.
 *
 * Shared count and title queries, and the bare `['research']` ongoing-studies
 * key, are kept.
 *
 * @param client - The query client to prune.
 * @param identity - The current identity whose queries are kept.
 */
export function pruneForeignResearchQueries(
  client: QueryClient,
  identity: ResearchIdentity
): void {
  const queries = client.getQueryCache().getAll();

  for (const query of queries) {
    const key = query.queryKey;
    const isForeignResearch =
      isResearchProgressKey(key) && !matchesIdentity(key, identity);
    const isForeignReport =
      isReportResponsesKey(key) && !matchesReportIdentity(key, identity);

    if (isForeignResearch || isForeignReport) {
      client.removeQueries({ queryKey: key, exact: true });
    }
  }
}

/**
 * Empties the in-memory query cache and removes the persisted record.
 *
 * @returns A promise settled once the persisted record is removed.
 */
export async function clearQueryCache(): Promise<void> {
  getAppQueryClient()?.clear();
  await queryPersister.removeClient();
}
