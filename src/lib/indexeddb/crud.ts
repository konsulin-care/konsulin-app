/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-parameters, unicorn/prefer-add-event-listener */
import { getStore, openDB } from './connection';
import type { StoreName } from './types';
import { STORES } from './types';

/**
 * Gets a single value by key from an IndexedDB store.
 *
 * @param storeName - The store to query.
 * @param key - The key to look up.
 * @returns The value, or null if not found.
 */
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

/**
 * Puts a value into an IndexedDB store.
 *
 * @param storeName - The store to write to.
 * @param value - The value to store.
 */
export async function dbSet<T>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readwrite').put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Deletes a value by key from an IndexedDB store.
 *
 * @param storeName - The store to delete from.
 * @param key - The key to delete.
 */
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

/**
 * Clears all entries from an IndexedDB store.
 *
 * @param storeName - The store to clear.
 */
export async function dbClearAll(storeName: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Gets all keys from an IndexedDB store.
 *
 * @param storeName - The store to query.
 * @returns Array of keys.
 */
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

/**
 * Gets all values from an IndexedDB store.
 *
 * @param storeName - The store to query.
 * @returns Array of values.
 */
export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = getStore(db, storeName, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Deletes all entries from a store that match a predicate using a cursor.
 *
 * @param storeName - The store to delete from.
 * @param predicate - Function returning true for entries to delete.
 */
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

/**
 * Clears all user data from all stores for a given owner ID.
 *
 * @param ownerId - The owner ID to clear data for.
 */
export async function clearUserData(ownerId: string): Promise<void> {
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
        (
          [
            'assessment_drafts',
            'ui_preferences',
            'navigation_state'
          ] as StoreName[]
        ).includes(storeName)
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

/**
 * Deletes a guest session from the store.
 *
 * @param guestId - The guest session ID to delete.
 */
export async function deleteGuestSession(guestId: string): Promise<void> {
  await dbDelete(STORES.guestSessions, guestId);
}
