import {
  DECISION_TREE,
  QUICK_COMPLAINT_IDS
} from '@/constants/recommendation-decision-tree';
import { SPECIALTY_RESOLUTIONS } from '@/data/specialty-resolution';
import { dbDelete, dbGet, dbSet, STORES } from '@/lib/indexeddb';
import type {
  ChiefComplaint,
  InterviewResult
} from '@/types/recommendation-interview';

const RECOMMENDATION_OWNER = 'recommendation';
const RECOMMENDATION_PREF_KEY = 'last-interview-result';

const ALL_COMPLAINTS: ChiefComplaint[] = DECISION_TREE.flatMap(
  domain => domain.complaints
);

const COMPLAINT_BY_ID = new Map(
  ALL_COMPLAINTS.map(complaint => [complaint.id, complaint])
);

/** Lowercased, trimmed search token matcher against label + synonyms. */
function matchesQuery(complaint: ChiefComplaint, query: string): boolean {
  const haystack = [complaint.label, ...complaint.synonyms]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

/**
 * Search chief complaints by label or synonym (English + Indonesian).
 *
 * An empty or whitespace-only query returns the top-5 quick complaints.
 *
 * @param query - Raw user search text
 * @returns Matching complaints in tree order (never more than tree size)
 */
export function searchChiefComplaints(query: string): ChiefComplaint[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return getQuickComplaints();
  return ALL_COMPLAINTS.filter(complaint => matchesQuery(complaint, trimmed));
}

/**
 * Return all 41 available chief complaints across all decision domains.
 *
 * @returns All chief complaints in decision tree order
 */
export function getAllChiefComplaints(): ChiefComplaint[] {
  return ALL_COMPLAINTS;
}

/**
 * Return the top-5 prevalence complaints as one-tap quick chips.
 *
 * @returns The five quick-chip complaints in declared order
 */
export function getQuickComplaints(): ChiefComplaint[] {
  const quick = QUICK_COMPLAINT_IDS.map(id => COMPLAINT_BY_ID.get(id));
  return quick.filter((c): c is ChiefComplaint => c !== undefined);
}

/**
 * Deterministically resolve an answered branch to a recommendation intent.
 *
 * The canonical NUCC code comes from the generated ontology resolution map
 * (SPECIALTY_RESOLUTIONS, produced by `make data-specialty`), so the decision
 * tree no longer pins a specialty per complaint. Selecting the "Other" option
 * maps the service code to the generic `other-{icfDomain}` code.
 *
 * @param complaintId - Selected chief complaint id
 * @param optionId - Optional selected symptom-focus option id
 * @returns The resolved interview result, or null when unknown
 */
export function resolveInterviewResult(
  complaintId: string | null | undefined,
  optionId?: string | null
): InterviewResult | null {
  if (!complaintId) return null;
  const complaint = COMPLAINT_BY_ID.get(complaintId);
  if (!complaint) return null;
  const resolution = SPECIALTY_RESOLUTIONS[complaintId];
  if (!resolution) return null;
  let isOther = false;
  if (optionId !== undefined && optionId !== null) {
    const option = complaint.options.find(o => o.id === optionId);
    if (!option) return null;
    isOther = option.isOther === true;
  }
  return {
    complaintId: complaint.id,
    complaintLabel: complaint.label,
    specialty: resolution.nuccCode,
    serviceTypeCode: isOther
      ? `other-${complaint.icfDomain}`
      : complaint.serviceTypeCode,
    icfDomain: complaint.icfDomain,
    redFlag: complaint.redFlag
  };
}

/**
 * Build BFF query params from a resolved interview result.
 *
 * Carries the service intent (`serviceTypeCode`, `icfDomain`) alongside the
 * canonical NUCC specialty so the BFF can rank by service relevance.
 *
 * @param result - Resolved interview result
 * @param lat - Optional latitude for proximity ranking
 * @param lon - Optional longitude for proximity ranking
 * @returns Params accepted by the recommendation endpoint
 */
export function buildRecommendationParams(
  result: InterviewResult,
  lat?: number,
  lon?: number
): {
  specialty: string;
  serviceTypeCode: string;
  icfDomain: string;
  lat?: number;
  lon?: number;
} {
  const base = {
    specialty: result.specialty,
    serviceTypeCode: result.serviceTypeCode,
    icfDomain: result.icfDomain
  };
  return lat !== undefined && lon !== undefined ? { ...base, lat, lon } : base;
}

/** Static shape guard for persisted interview results. */
function isInterviewResult(value: unknown): value is InterviewResult {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.complaintId === 'string' &&
    typeof candidate.complaintLabel === 'string' &&
    typeof candidate.specialty === 'string' &&
    typeof candidate.serviceTypeCode === 'string' &&
    typeof candidate.icfDomain === 'string' &&
    typeof candidate.redFlag === 'object' &&
    candidate.redFlag !== null
  );
}

/**
 * Persist the last completed interview so the patient home can render
 * live recommendations on the next visit. Best-effort: failures are
 * swallowed (storage may be unavailable in private mode).
 *
 * @param result - The interview result to store
 */
export async function saveLastInterviewResult(
  result: InterviewResult
): Promise<void> {
  try {
    await dbSet(STORES.uiPreferences, {
      ownerId: RECOMMENDATION_OWNER,
      prefKey: RECOMMENDATION_PREF_KEY,
      result
    });
  } catch {
    // Storage unavailable — non-critical, ignore.
  }
}

/**
 * Read the last persisted interview result, if any.
 *
 * @returns The stored result, or null when absent or malformed
 */
export async function readLastInterviewResult(): Promise<InterviewResult | null> {
  try {
    const stored = await dbGet<{ result: InterviewResult }>(
      STORES.uiPreferences,
      [RECOMMENDATION_OWNER, RECOMMENDATION_PREF_KEY]
    );
    if (!stored) return null;
    return isInterviewResult(stored.result) ? stored.result : null;
  } catch {
    return null;
  }
}

/**
 * Clear the persisted interview result (e.g., on explicit reset).
 */
export async function clearLastInterviewResult(): Promise<void> {
  try {
    await dbDelete(STORES.uiPreferences, [
      RECOMMENDATION_OWNER,
      RECOMMENDATION_PREF_KEY
    ]);
  } catch {
    // Storage unavailable — non-critical, ignore.
  }
}
