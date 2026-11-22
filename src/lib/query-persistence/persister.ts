import { dbDelete, dbGet, dbSet, STORES } from '@/lib/indexeddb';
import type {
  PersistedClient,
  Persister
} from '@tanstack/react-query-persist-client';

/** Key under which the dehydrated TanStack Query client is stored. */
const QUERY_CACHE_KEY = 'tanstack-query';

/** Trailing throttle window for writes, in milliseconds. */
const PERSIST_THROTTLE_MS = 1000;

/** Shape of the single record stored in the `query_cache` store. */
interface QueryCacheRecord {
  key: string;
  client: PersistedClient;
}

/**
 * Checks whether a dehydrated client has nothing worth persisting.
 *
 * @param client - The persisted client to inspect.
 * @returns True when both the query and mutation lists are empty.
 */
function isEmptyClient(client: PersistedClient): boolean {
  return (
    client.clientState.queries.length === 0 &&
    client.clientState.mutations.length === 0
  );
}

/**
 * Creates a TanStack Query persister backed by the existing IndexedDB helpers.
 *
 * Writes are trailing-throttled at 1000 ms and always store the most recent
 * client via structured clone. An empty client removes the stored record
 * instead of writing it.
 *
 * @returns A {@link Persister} for use with PersistQueryClientProvider.
 */
export function createQueryPersister(): Persister {
  let pendingClient: PersistedClient | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Clears any scheduled throttled write.
   */
  const cancelPending = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    pendingClient = null;
  };

  /**
   * Writes or deletes the currently pending client.
   */
  const flush = async (): Promise<void> => {
    timer = null;
    const client = pendingClient;
    pendingClient = null;

    if (client === null) return;

    if (isEmptyClient(client)) {
      await dbDelete(STORES.queryCache, QUERY_CACHE_KEY);
      return;
    }

    const record: QueryCacheRecord = { key: QUERY_CACHE_KEY, client };
    await dbSet(STORES.queryCache, record);
  };

  return {
    persistClient(client: PersistedClient): void {
      pendingClient = client;

      if (timer !== null) return;

      timer = setTimeout(() => {
        void flush();
      }, PERSIST_THROTTLE_MS);
    },

    async restoreClient(): Promise<PersistedClient | undefined> {
      const record = await dbGet<QueryCacheRecord>(
        STORES.queryCache,
        QUERY_CACHE_KEY
      );

      return record?.client ?? undefined;
    },

    async removeClient(): Promise<void> {
      cancelPending();
      await dbDelete(STORES.queryCache, QUERY_CACHE_KEY);
    }
  };
}

/** Shared persister instance for the application query client. */
export const queryPersister: Persister = createQueryPersister();
