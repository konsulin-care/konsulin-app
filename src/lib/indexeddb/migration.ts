/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-type-parameters, unicorn/prefer-add-event-listener */
import { openDB } from './connection';
import { STORES, type StoreName } from './types';

const MIGRATION_FLAG = 'konsulin_migration_done';

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

/**
 * Migrates data from localStorage to IndexedDB, one-time operation.
 *
 * @returns Promise that resolves when migration is complete.
 */
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
    pendingMigrations.push(() => migrateSoapDrafts(db));
  }

  let responseKeys: string[] = [];
  let srKeys: string[] = [];
  for (const pm of pendingMigrations) {
    const keys = await pm();
    if (keys.length === 0) continue;
    if (keys[0]?.startsWith('response_')) responseKeys = keys;
    else if (keys[0]?.startsWith('serviceRequest_')) srKeys = keys;
    else soapKeys = keys;
  }

  cleanupMigratedKeys(responseKeys, srKeys, soapKeys);
  setMigrationFlag();
}
