/**
 * Referral and share helpers for the research virality loop.
 *
 * Patients share a link carrying `?ref=p_<fhirId>` so referees can be
 * attributed on completion; guests share a plain link with no attribution.
 * Each converted referee adds 1 XP via FHIR Communications.
 */

/** Prefix marking a patient referral ref. */
export const PATIENT_REF_PREFIX = 'p_';

/** localStorage key for the captured referral ref. */
export const REFERRAL_STORAGE_KEY = 'konsulin_ref';

/** localStorage prefix for per-batch referral-written flags. */
export const REFERRAL_WRITTEN_PREFIX = 'konsulin_referral_written_';

/** A parsed patient referral ref. */
export type ReferralRef = {
  kind: 'patient';
  fhirId: string;
};

/**
 * Builds the shareable research URL for a user.
 *
 * When a studyId is given, the URL deep-links to that study on the research
 * page (`/research?id={studyId}`); patients additionally carry the referral
 * ref. Absent studyId, the plain research page URL is built, keeping existing
 * callers valid.
 *
 * @param opts - Origin, whether the user is a patient, the patient fhirId, and
 * optionally the study to deep-link.
 * @returns The share URL, with ref for patients and plain for guests.
 */
export function buildShareUrl(opts: {
  origin: string;
  isPatient: boolean;
  fhirId?: string;
  studyId?: string;
}): string {
  const base = `${opts.origin}/research`;
  const params = new URLSearchParams();
  if (opts.studyId) params.set('id', opts.studyId);
  if (opts.isPatient && opts.fhirId) {
    params.set('ref', `${PATIENT_REF_PREFIX}${opts.fhirId}`);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

/**
 * Parses a referral ref into a patient referrer, or null.
 *
 * @param ref - The raw `?ref=` value.
 * @returns The referrer identity, or null when absent or malformed.
 */
export function parseReferralRef(ref?: string | null): ReferralRef | null {
  if (!ref) return null;
  if (!ref.startsWith(PATIENT_REF_PREFIX)) return null;
  const fhirId = ref.slice(PATIENT_REF_PREFIX.length);
  if (!fhirId) return null;
  return { kind: 'patient', fhirId };
}

/**
 * English prefilled message for the research share flow.
 *
 * Invites the recipient to join the study as a citizen scientist, ending
 * with a newline so the shared URL starts on its own line.
 *
 * @param title - Research study title to interpolate.
 * @returns The share message text.
 */
export function buildResearchShareMessage(title: string): string {
  return `Join me as a citizen scientist through ${title} in Konsulin.\n`;
}

/**
 * Reads the referral ref from a landing url's `?ref=` parameter.
 *
 * @param url - Landing page url.
 * @returns The raw ref value, or null when absent.
 */
export function readRefFromUrl(url: string): string | null {
  return new URL(url).searchParams.get('ref');
}

/**
 * Captures a referral ref when it is a valid patient ref.
 *
 * Guests share plain links, so anything that is not a patient ref (absent,
 * empty, or malformed) is ignored and never overwrites a stored ref.
 *
 * @param ref - Raw `?ref=` value.
 * @param storage - Storage-like object (localStorage in browsers).
 */
export function captureReferralRef(ref: string | null, storage: Storage): void {
  const parsed = parseReferralRef(ref);
  if (parsed) {
    storage.setItem(REFERRAL_STORAGE_KEY, ref ?? '');
  }
}

/**
 * Reads the stored referral ref, if any.
 *
 * @param storage - Storage-like object (localStorage in browsers).
 * @returns The raw ref value, or null when absent.
 */
export function readStoredReferralRef(storage: Storage): string | null {
  return storage.getItem(REFERRAL_STORAGE_KEY);
}

/**
 * True when a referral Communication has been written for a batch.
 *
 * @param storage - Storage-like object (localStorage in browsers).
 * @param batchId - Batch PlanDefinition id.
 * @returns True when the batch was already recorded.
 */
export function isReferralWritten(storage: Storage, batchId: string): boolean {
  return storage.getItem(`${REFERRAL_WRITTEN_PREFIX}${batchId}`) === '1';
}

/**
 * Marks a batch as having its referral Communication written.
 *
 * @param storage - Storage-like object (localStorage in browsers).
 * @param batchId - Batch PlanDefinition id.
 */
export function markReferralWritten(storage: Storage, batchId: string): void {
  storage.setItem(`${REFERRAL_WRITTEN_PREFIX}${batchId}`, '1');
}

/**
 * Clears all local research and referral state on erasure.
 *
 * Removes the captured referral ref and every per-batch written flag. Called
 * on account deletion or participation revocation alongside the server-side
 * purge.
 *
 * @param storage - Storage-like object (localStorage in browsers).
 */
export function clearReferralLocalState(storage: Storage): void {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    const isReferralKey =
      key === REFERRAL_STORAGE_KEY ||
      (key?.startsWith(REFERRAL_WRITTEN_PREFIX) ?? false);
    if (isReferralKey && key !== null) {
      keys.push(key);
    }
  }
  for (const key of keys) {
    storage.removeItem(key);
  }
}
