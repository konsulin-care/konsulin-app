/* eslint-disable max-lines, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-parameters, unicorn/prefer-includes-over-repeated-comparisons, unicorn/prefer-add-event-listener */
const DB_NAME = 'konsulin';
export const DB_VERSION = 3;

export const STORES = {
  guestSessions: 'guest_sessions',
  assessmentDrafts: 'assessment_drafts',
  soapDrafts: 'soap_drafts',
  serviceRequests: 'service_requests',
  tempBooking: 'temp_booking',
  uiPreferences: 'ui_preferences',
  navigationState: 'navigation_state',
  userProfile: 'user_profile',
  pendingSubmissions: 'pending_submissions'
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

/** A submission that failed to send and is waiting for a replay attempt. */
export type PendingSubmission<T = unknown> = {
  id: string;
  ownerId: string;
  kind: string;
  payload: T;
  createdAt: number;
  attempts: number;
};

export const STORE_SCHEMAS: { name: StoreName; keyPath: string | string[] }[] =
  [
    { name: STORES.guestSessions, keyPath: 'guest_id' },
    { name: STORES.assessmentDrafts, keyPath: ['ownerId', 'questionnaireId'] },
    { name: STORES.soapDrafts, keyPath: ['practitionerId', 'patientId'] },
    { name: STORES.serviceRequests, keyPath: 'id' },
    { name: STORES.tempBooking, keyPath: 'ownerId' },
    { name: STORES.uiPreferences, keyPath: ['ownerId', 'prefKey'] },
    { name: STORES.navigationState, keyPath: ['ownerId', 'stateKey'] },
    { name: STORES.userProfile, keyPath: 'userId' },
    { name: STORES.pendingSubmissions, keyPath: 'id' }
  ];

/** Cached DB connection promise, reused across calls. */
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Handles a VersionError from the primary openDB attempt.
 * Discovers the existing DB version and re-opens at that version.
 * This is a dev rollback safety: the on-disk version exceeded DB_VERSION.
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

/** Opens the IndexedDB database, caching the connection for subsequent calls. */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise !== null) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    // Primary path: single open at DB_VERSION (normal case)
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

/** Returns an object store for the given database and store name. */
export function getStore(
  db: IDBDatabase,
  name: StoreName,
  mode: IDBTransactionMode = 'readonly'
): IDBObjectStore {
  return db.transaction(name, mode).objectStore(name);
}

/** Gets a single value by key from an IndexedDB store. */
export async function dbGet<T>(
  storeName: StoreName,
  key: IDBValidKey
): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readonly').get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

/** Puts a value into an IndexedDB store. */
export async function dbSet<T>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readwrite').put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Deletes a value by key from an IndexedDB store. */
export async function dbDelete(
  storeName: StoreName,
  key: IDBValidKey
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readwrite').delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Clears all entries from an IndexedDB store. */
export async function dbClearAll(storeName: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/** Gets all keys from an IndexedDB store. */
export async function dbGetAllKeys(
  storeName: StoreName
): Promise<IDBValidKey[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readonly').getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Gets all values from an IndexedDB store. */
export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Deletes all entries from a store that match a predicate using a cursor. */
export async function cursorDeleteAll(
  storeName: StoreName,
  predicate: (value: unknown, key: IDBValidKey) => boolean
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const txn = db.transaction(storeName, 'readwrite');
    const store = txn.objectStore(storeName);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if (predicate(cursor.value, cursor.key)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    req.onerror = () => reject(req.error);
    txn.oncomplete = () => resolve();
    txn.onerror = event => {
      reject(
        (event.target as IDBRequest)?.error || new Error('transaction failed')
      );
    };
  });
}

/** Clears all user data from all stores for a given owner ID. */
export async function clearUserData(ownerId: string): Promise<void> {
  // The last-interview-result record is owner-less (guest-shared); delete it
  // explicitly since cursorDeleteAll on uiPreferences only matches by ownerId.
  await dbDelete(STORES.uiPreferences, ['last-interview-result']);

  const allStores = Object.values(STORES);
  for (const storeName of allStores) {
    await cursorDeleteAll(storeName, (value: Record<string, unknown>) => {
      if (storeName === STORES.guestSessions) {
        return value.guest_id === ownerId;
      }
      if (storeName === STORES.serviceRequests) {
        return value.ownerId === ownerId;
      }
      if (
        storeName === STORES.assessmentDrafts ||
        storeName === STORES.uiPreferences ||
        storeName === STORES.navigationState
      ) {
        return value.ownerId === ownerId;
      }
      if (storeName === STORES.soapDrafts) {
        return value.practitionerId === ownerId;
      }
      if (storeName === STORES.tempBooking) {
        return value.ownerId === ownerId;
      }
      if (storeName === STORES.userProfile) {
        return value.userId === ownerId;
      }
      return false;
    });
  }
}

/** Deletes a guest session from the store. */
export async function deleteGuestSession(guestId: string): Promise<void> {
  await dbDelete(STORES.guestSessions, guestId);
}

/** Puts multiple values into a store within a single transaction. */
function putWithTransaction<T>(
  db: IDBDatabase,
  storeName: StoreName,
  values: T[]
): Promise<void> {
  if (values.length === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const txn = db.transaction(storeName, 'readwrite');
    const store = txn.objectStore(storeName);
    for (const value of values) {
      store.put(value);
    }
    txn.oncomplete = () => resolve();
    txn.onerror = event => {
      reject(
        (event.target as IDBRequest)?.error || new Error('transaction failed')
      );
    };
  });
}

const MIGRATION_FLAG = 'konsulin_migration_done';

/** Migrates the anonymous guest session ID from localStorage to IndexedDB. */
async function migrateGuestSessions(
  db: IDBDatabase,
  guestId: string
): Promise<void> {
  if (!guestId) return;
  await putWithTransaction(db, STORES.guestSessions, [{ guest_id: guestId }]);
}

/** Migrates assessment draft responses from localStorage to IndexedDB. */
async function migrateAssessmentDrafts(
  db: IDBDatabase,
  ownerId: string
): Promise<string[]> {
  const responseKeys = Object.keys(localStorage).filter(k =>
    k.startsWith('response_')
  );
  const assessmentValues: {
    ownerId: string;
    questionnaireId: string;
    response: unknown;
    updatedAt: number;
  }[] = [];
  for (const key of responseKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        assessmentValues.push({
          ownerId,
          questionnaireId: key.replace('response_', ''),
          response: JSON.parse(raw),
          updatedAt: Date.now()
        });
      }
    } catch {
      // skip corrupt entries
    }
  }
  await putWithTransaction(db, STORES.assessmentDrafts, assessmentValues);
  return responseKeys;
}

/** Migrates service request IDs from localStorage to IndexedDB. */
async function migrateServiceRequests(
  db: IDBDatabase,
  ownerId: string
): Promise<string[]> {
  const srKeys = Object.keys(localStorage).filter(k =>
    k.startsWith('serviceRequest_')
  );
  const srValues: {
    id: string;
    ownerId: string;
    serviceRequestId: string;
    updatedAt: number;
  }[] = [];
  for (const key of srKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        srValues.push({
          id: key.replace('serviceRequest_', ''),
          ownerId,
          serviceRequestId: raw.trim(),
          updatedAt: Date.now()
        });
      }
    } catch {
      // skip corrupt entries
    }
  }
  await putWithTransaction(db, STORES.serviceRequests, srValues);
  return srKeys;
}

/** Migrates SOAP note drafts from localStorage to IndexedDB. */
async function migrateSoapDrafts(db: IDBDatabase): Promise<string[]> {
  const soapKeys = Object.keys(localStorage).filter(k =>
    k.startsWith('soap_draft_')
  );
  if (soapKeys.length === 0) return soapKeys;
  const soapValues: {
    practitionerId: string;
    patientId: string;
    value: unknown;
    updatedAt: number;
  }[] = [];
  for (const key of soapKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        // Key format: soap_draft_{practitionerId}_{patientId}
        const parts = key.replace('soap_draft_', '').split('_');
        soapValues.push({
          practitionerId: parts[0] || '',
          patientId: parts[1] || '',
          value: JSON.parse(raw),
          updatedAt: Date.now()
        });
      }
    } catch {
      // skip corrupt entries
    }
  }
  if (soapValues.length > 0) {
    await putWithTransaction(db, STORES.soapDrafts, soapValues);
  }
  return soapKeys;
}

/** Migrates temporary booking data from localStorage to IndexedDB. */
async function migrateTempBooking(
  db: IDBDatabase,
  ownerId: string
): Promise<void> {
  try {
    const raw = localStorage.getItem('temp-booking');
    if (raw) {
      await putWithTransaction(db, STORES.tempBooking, [
        {
          ownerId,
          ...JSON.parse(raw),
          updatedAt: Date.now()
        }
      ]);
    }
  } catch {
    // skip
  }
}

/** Migrates UI preference values from localStorage to IndexedDB. */
async function migrateUiPreferences(
  db: IDBDatabase,
  ownerId: string
): Promise<void> {
  const prefMappings: Record<string, string> = {
    'result-table-colors': 'result-table-colors',
    selected_clinic: 'selected_clinic',
    selected_practitioner: 'selected_practitioner',
    'skip-response-cleanup': 'skip-response-cleanup'
  };
  const prefValues: { ownerId: string; prefKey: string; value: unknown }[] = [];
  for (const [lsKey, prefKey] of Object.entries(prefMappings)) {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw !== null) {
        prefValues.push({
          ownerId,
          prefKey,
          value: (() => {
            try {
              return JSON.parse(raw);
            } catch {
              return raw;
            }
          })()
        });
      }
    } catch {
      // skip
    }
  }
  await putWithTransaction(db, STORES.uiPreferences, prefValues);
}

/** Removes migrated keys from localStorage to complete the migration. */
function cleanupMigratedKeys(
  responseKeys: string[],
  srKeys: string[],
  soapKeys: string[]
): void {
  const lsKeysToRemove = [
    'konsulin.guest_id',
    'redirect',
    ...responseKeys,
    ...soapKeys,
    ...srKeys,
    'temp-booking',
    'result-table-colors',
    'selected_clinic',
    'selected_practitioner',
    'skip-response-cleanup'
  ];
  for (const key of lsKeysToRemove) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

/** Sets the migration completion flag in localStorage. */
function setMigrationFlag(): void {
  try {
    localStorage.setItem(MIGRATION_FLAG, 'true');
  } catch {
    /* ignore */
  }
}

/** Migrates data from localStorage to IndexedDB, one-time operation. */
export async function migrateLocalStorage(): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') return;
  } catch {
    return;
  }

  const db = await openDB();

  const guestId = (() => {
    try {
      return localStorage.getItem('konsulin.guest_id') ?? '';
    } catch {
      return '';
    }
  })();

  let soapKeys: string[] = [];
  const pendingMigrations: (() => Promise<string[]>)[] = [];

  // Only run owner-scoped migrations when a real guestId exists.
  if (guestId) {
    await migrateGuestSessions(db, guestId);
    pendingMigrations.push(
      () => migrateAssessmentDrafts(db, guestId),
      () => migrateServiceRequests(db, guestId),
      async () => {
        await migrateTempBooking(db, guestId);
        return [];
      },
      async () => {
        await migrateUiPreferences(db, guestId);
        return [];
      },
      () => migrateSoapDrafts(db)
    );
  } else {
    // Without a guestId, migrate only what doesn't need owner scoping.
    pendingMigrations.push(() => migrateSoapDrafts(db));
  }

  let responseKeys: string[] = [];
  let srKeys: string[] = [];
  for (const pm of pendingMigrations) {
    const keys = await pm();
    if (keys.length === 0) continue;
    // Categorize keys by prefix.
    if (keys[0]?.startsWith('response_')) responseKeys = keys;
    else if (keys[0]?.startsWith('serviceRequest_')) srKeys = keys;
    else soapKeys = keys;
  }

  // Only mark migration complete once soapKeys has been processed.
  cleanupMigratedKeys(responseKeys, srKeys, soapKeys);
  setMigrationFlag();
}
