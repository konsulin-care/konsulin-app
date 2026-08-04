/**
 * Referral and share helpers for the research virality loop.
 *
 * Patients share a link carrying `?ref=p_<fhirId>` so referees can be
 * attributed on completion; guests share a plain link with no attribution.
 * A local share-booster counter rewards repeat sharing (badges at 1/3/5).
 */

/** Prefix marking a patient referral ref. */
export const PATIENT_REF_PREFIX = 'p_';

/** localStorage key for the share-booster counter. */
export const SHARE_BOOSTER_KEY = 'konsulin_share_booster';

/** A parsed patient referral ref. */
export type ReferralRef = {
  kind: 'patient';
  fhirId: string;
};

/** Badge names unlocked by the share booster. */
export type ShareBadge = 'buddy' | 'community-researcher' | 'captain';

/** Badge thresholds, highest first. */
export const SHARE_BADGES: ReadonlyArray<{
  count: number;
  badge: ShareBadge;
}> = [
  { count: 5, badge: 'captain' },
  { count: 3, badge: 'community-researcher' },
  { count: 1, badge: 'buddy' }
];

/**
 * Builds the shareable research URL for a user.
 *
 * @param opts - Origin, whether the user is a patient, and the patient fhirId.
 * @returns The share URL, with ref for patients and plain for guests.
 */
export function buildShareUrl(opts: {
  origin: string;
  isPatient: boolean;
  fhirId?: string;
}): string {
  const base = `${opts.origin}/research`;
  if (opts.isPatient && opts.fhirId) {
    return `${base}?ref=${PATIENT_REF_PREFIX}${opts.fhirId}`;
  }
  return base;
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
 * Bahasa Indonesia prefilled message for the wa.me share template.
 *
 * @returns The share message text.
 */
export function buildShareMessage(): string {
  return 'Yuk ikut riset kesehatan di Konsulin! Selesaikan batch-nya dan dukung riset komunitas.';
}

/**
 * Builds a one-tap wa.me share URL with the prefilled message encoded.
 *
 * @param message - Message text to prefill.
 * @returns The wa.me URL.
 */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Highest share badge unlocked for a share count.
 *
 * @param count - Number of shares recorded.
 * @returns The badge name, or null before the first share.
 */
export function shareBadgeFor(count: number): ShareBadge | null {
  for (const { count: threshold, badge } of SHARE_BADGES) {
    if (count >= threshold) return badge;
  }
  return null;
}

/**
 * Reads the share-booster counter, tolerating corrupt storage.
 *
 * @param storage - Storage-like object (localStorage in browsers).
 * @returns The recorded count, 0 when absent or invalid.
 */
export function readShareCount(storage: Storage): number {
  const raw = storage.getItem(SHARE_BOOSTER_KEY);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Persists the share-booster counter.
 *
 * @param storage - Storage-like object (localStorage in browsers).
 * @param count - Count to store.
 */
export function writeShareCount(storage: Storage, count: number): void {
  storage.setItem(SHARE_BOOSTER_KEY, String(count));
}
