import type { Communication } from 'fhir/r4';

/** Aggregated referral network stats for one user's circle. */
export interface CircleStats {
  /** Distinct referees who completed a batch via this user's link. */
  converted: number;
  /** Total referrals recorded for this user (distinct converted referees). */
  joined: number;
}

/**
 * Derives circle stats from the user's research-referral Communications.
 *
 * Every written Communication records a batch completion, so joined and
 * converted are the same distinct-referee set. Recipients are deduped by
 * reference.
 *
 * @param communications - The user's referral Communications.
 * @returns Joined and converted counts.
 */
export function deriveCircleStats(
  communications: Communication[]
): CircleStats {
  const recipients = new Set<string>();
  for (const comm of communications) {
    const ref = comm.recipient?.[0]?.reference;
    if (ref) recipients.add(ref);
  }
  const converted = recipients.size;
  return { converted, joined: converted };
}
