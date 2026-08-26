/**
 * Tracks whether a superadmin key session exists. Only a boolean flag is
 * stored in sessionStorage — the key itself lives in an HttpOnly cookie set
 * by the BFF and is never exposed to JS.
 */

/** sessionStorage key holding the boolean key-set flag (value "1"). */
export const KEY_SET_FLAG = 'konsulin_admin_key_set';

/** True when sessionStorage is available (browser only, not SSR). */
function hasSessionStorage(): boolean {
  return typeof window !== 'undefined' && 'sessionStorage' in window;
}

/**
 * Returns true when a superadmin key session was established.
 *
 * @returns true if the key-set flag is present in sessionStorage
 */
export function isKeySet(): boolean {
  if (!hasSessionStorage()) return false;
  return window.sessionStorage.getItem(KEY_SET_FLAG) === '1';
}

/** Marks the superadmin key session as established. */
export function markKeySet(): void {
  if (!hasSessionStorage()) return;
  window.sessionStorage.setItem(KEY_SET_FLAG, '1');
}

/** Clears the key-set flag (used by the lock button). */
export function clearKeyFlag(): void {
  if (!hasSessionStorage()) return;
  window.sessionStorage.removeItem(KEY_SET_FLAG);
}
