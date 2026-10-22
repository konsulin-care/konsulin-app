/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-parameters, unicorn/prefer-includes-over-repeated-comparisons, unicorn/prefer-add-event-listener */
import { DB_NAME, DB_VERSION, STORE_SCHEMAS, type StoreName } from './types';

/** Cached DB connection promise, reused across calls. */
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Handles a VersionError from the primary openDB attempt.
 * Discovers the existing DB version and re-opens at that version.
 */
function handleVersionError(
  resolve: (db: IDBDatabase) => void,
  reject: (err: unknown) => void
): void {
  const discovery = indexedDB.open(DB_NAME);
  discovery.onsuccess = () => {
    const existing = discovery.result;
    const version = existing.version;
    existing.close();

    const retry = indexedDB.open(DB_NAME, version);
    retry.onsuccess = () => {
      const db = retry.result;
      db.addEventListener('close', () => {
        dbPromise = null;
      });
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    retry.onerror = () => {
      dbPromise = null;
      reject(retry.error);
    };
  };
  discovery.onerror = () => {
    dbPromise = null;
    reject(discovery.error);
  };
}

/**
 * Opens the IndexedDB database, caching the connection for subsequent calls.
 *
 * @returns Promise resolving to the IDBDatabase instance.
 */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise !== null) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const schema of STORE_SCHEMAS) {
        if (!db.objectStoreNames.contains(schema.name)) {
          db.createObjectStore(schema.name, { keyPath: schema.keyPath });
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.addEventListener('close', () => {
        dbPromise = null;
      });
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      if (request.error?.name === 'VersionError') {
        handleVersionError(resolve, reject);
      } else {
        dbPromise = null;
        reject(request.error);
      }
    };
  });

  return dbPromise;
}

/**
 * Returns an object store for the given database and store name.
 *
 * @param db - The IDBDatabase instance.
 * @param name - The store name.
 * @param mode - Transaction mode (default: 'readonly').
 * @returns The IDBObjectStore.
 */
export function getStore(
  db: IDBDatabase,
  name: StoreName,
  mode: IDBTransactionMode = 'readonly'
): IDBObjectStore {
  return db.transaction(name, mode).objectStore(name);
}
