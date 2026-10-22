/** localStorage key prefix for per-study guest consent flags. */
export const CONSENT_FLAG_PREFIX = 'konsulin_consent_';

/**
 * Builds the localStorage key for a study's consent flag.
 *
 * @param studyId - Bare research study id.
 * @returns The namespaced storage key.
 */
export function consentStorageKey(studyId: string): string {
  return `${CONSENT_FLAG_PREFIX}${studyId}`;
}

/**
 * Reads a per-study consent flag.
 *
 * @param storage - Storage-like object (localStorage in browsers).
 * @param studyId - Bare research study id.
 * @returns True when consent was recorded for the study.
 */
export function readConsentFlag(storage: Storage, studyId: string): boolean {
  return storage.getItem(consentStorageKey(studyId)) === '1';
}

/**
 * Persists a per-study consent flag.
 *
 * @param storage - Storage-like object (localStorage in browsers).
 * @param studyId - Bare research study id.
 */
export function writeConsentFlag(storage: Storage, studyId: string): void {
  storage.setItem(consentStorageKey(studyId), '1');
}

/**
 * Removes a per-study consent flag.
 *
 * @param storage - Storage-like object (localStorage in browsers).
 * @param studyId - Bare research study id.
 */
export function clearConsentFlag(storage: Storage, studyId: string): void {
  storage.removeItem(consentStorageKey(studyId));
}
