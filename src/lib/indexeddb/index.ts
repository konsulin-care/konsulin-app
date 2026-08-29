/**
 * IndexedDB persistence layer for Konsulin.
 *
 * Re-exports everything from submodules so consumers can import from
 * `@/lib/indexeddb` without change.
 */

// Types and constants
export {
  DB_VERSION,
  STORES,
  STORE_SCHEMAS,
  type PendingSubmission,
  type StoreName
} from './types';

// Connection management
export { getStore, openDB } from './connection';

// Generic CRUD operations
export {
  clearUserData,
  cursorDeleteAll,
  dbClearAll,
  dbDelete,
  dbGet,
  dbGetAll,
  dbGetAllKeys,
  dbSet,
  deleteGuestSession
} from './crud';

// localStorage → IndexedDB migration
export { migrateLocalStorage } from './migration';
