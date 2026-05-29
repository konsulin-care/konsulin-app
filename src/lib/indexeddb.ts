const DB_NAME = 'konsulin';
const DB_VERSION = 2;

export const STORES = {
  guestSessions: 'guest_sessions',
  assessmentDrafts: 'assessment_drafts',
  soapDrafts: 'soap_drafts',
  serviceRequests: 'service_requests',
  tempBooking: 'temp_booking',
  uiPreferences: 'ui_preferences',
  navigationState: 'navigation_state',
  userProfile: 'user_profile'
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

const STORE_SCHEMAS: { name: StoreName; keyPath: string | string[] }[] = [
  { name: STORES.guestSessions, keyPath: 'guest_id' },
  { name: STORES.assessmentDrafts, keyPath: ['ownerId', 'questionnaireId'] },
  { name: STORES.soapDrafts, keyPath: ['practitionerId', 'patientId'] },
  { name: STORES.serviceRequests, keyPath: 'id' },
  { name: STORES.tempBooking, keyPath: 'ownerId' },
  { name: STORES.uiPreferences, keyPath: ['ownerId', 'prefKey'] },
  { name: STORES.navigationState, keyPath: ['ownerId', 'stateKey'] },
  { name: STORES.userProfile, keyPath: 'userId' }
];

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const schema of STORE_SCHEMAS) {
        if (!db.objectStoreNames.contains(schema.name)) {
          db.createObjectStore(schema.name, { keyPath: schema.keyPath });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getStore(
  db: IDBDatabase,
  name: StoreName,
  mode: IDBTransactionMode = 'readonly'
): IDBObjectStore {
  return db.transaction(name, mode).objectStore(name);
}

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

export async function dbSet<T>(
  storeName: StoreName,
  value: T
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readwrite').put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

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

export async function dbClearAll(storeName: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

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

export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cursorDeleteAll(
  storeName: StoreName,
  predicate: (value: any, key: IDBValidKey) => boolean
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore(db, storeName, 'readwrite');
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if (predicate(cursor.value, cursor.key)) {
          cursor.delete();
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearUserData(ownerId: string): Promise<void> {
  const allStores = Object.values(STORES);
  for (const storeName of allStores) {
    await cursorDeleteAll(storeName, (value: any) => {
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

export async function deleteGuestSession(
  guestId: string
): Promise<void> {
  await dbDelete(STORES.guestSessions, guestId);
}

const MIGRATION_FLAG = 'konsulin_migration_done';

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

  const ownerId = guestId || 'anonymous';

  // 1. guest_sessions: konsulin.guest_id
  if (guestId) {
    const store = getStore(db, STORES.guestSessions, 'readwrite');
    store.put({ guest_id: guestId });
  }

  // 2. assessment_drafts: response_{questionnaireId}
  const responseKeys = Object.keys(localStorage).filter(k =>
    k.startsWith('response_')
  );
  for (const key of responseKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const questionnaireId = key.replace('response_', '');
        const store = getStore(db, STORES.assessmentDrafts, 'readwrite');
        store.put({
          ownerId,
          questionnaireId,
          response: JSON.parse(raw),
          updatedAt: Date.now()
        });
      }
    } catch {
      // skip corrupt entries
    }
  }

  // 3. soap_drafts: soap_{patientId}
  const soapKeys = Object.keys(localStorage).filter(k =>
    k.startsWith('soap_')
  );
  for (const key of soapKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const patientId = key.replace('soap_', '');
        const store = getStore(db, STORES.soapDrafts, 'readwrite');
        store.put({
          practitionerId: '',
          patientId,
          draft: JSON.parse(raw),
          updatedAt: Date.now()
        });
      }
    } catch {
      // skip corrupt entries
    }
  }

  // 4. service_requests: serviceRequest_{recordId}
  const srKeys = Object.keys(localStorage).filter(k =>
    k.startsWith('serviceRequest_')
  );
  for (const key of srKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const recordId = key.replace('serviceRequest_', '');
        const store = getStore(db, STORES.serviceRequests, 'readwrite');
        store.put({
          id: recordId,
          ownerId,
          serviceRequestId: raw.trim(),
          updatedAt: Date.now()
        });
      }
    } catch {
      // skip corrupt entries
    }
  }

  // 5. temp_booking
  try {
    const raw = localStorage.getItem('temp-booking');
    if (raw) {
      const store = getStore(db, STORES.tempBooking, 'readwrite');
      store.put({
        ownerId,
        ...JSON.parse(raw),
        updatedAt: Date.now()
      });
    }
  } catch {
    // skip
  }

  // 6. ui_preferences: result-table-colors, selected_clinic, selected_practitioner, skip-response-cleanup
  const prefMappings: Record<string, string> = {
    'result-table-colors': 'result-table-colors',
    'selected_clinic': 'selected_clinic',
    'selected_practitioner': 'selected_practitioner',
    'skip-response-cleanup': 'skip-response-cleanup'
  };
  for (const [lsKey, prefKey] of Object.entries(prefMappings)) {
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw !== null) {
        const store = getStore(db, STORES.uiPreferences, 'readwrite');
        store.put({
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

  // Remove all migrated localStorage keys
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
      // ignore
    }
  }

  try {
    localStorage.setItem(MIGRATION_FLAG, 'true');
  } catch {
    // ignore
  }
}
