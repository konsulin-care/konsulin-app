/**
 * @deprecated Import from '@/lib/indexeddb' submodules instead.
 * This file is kept as a re-export shim for backward compatibility.
 */
export {
  DB_VERSION,
  STORES,
  STORE_SCHEMAS,
  clearUserData,
  cursorDeleteAll,
  dbClearAll,
  dbDelete,
  dbGet,
  dbGetAll,
  dbGetAllKeys,
  dbSet,
  deleteGuestSession,
  getStore,
  migrateLocalStorage,
  openDB,
  type PendingSubmission,
  type StoreName
} from './indexeddb';
