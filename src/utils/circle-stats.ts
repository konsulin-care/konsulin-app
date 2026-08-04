import type { Communication } from 'fhir/r4';

/** Community-track milestones by converted referees count. */
export const COMMUNITY_MILESTONES: ReadonlyArray<{
  threshold: number;
  milestone: CommunityMilestone;
}> = [
  { threshold: 5, milestone: 'captain' },
  { threshold: 3, milestone: 'community-researcher' },
  { threshold: 1, milestone: 'buddy' }
];

/** Community-track milestone names. */
export type CommunityMilestone = 'buddy' | 'community-researcher' | 'captain';

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

/**
 * Highest community milestone unlocked for a converted count.
 *
 * @param converted - Number of distinct converted referees.
 * @returns The milestone name, or null before the first conversion.
 */
export function communityMilestoneFor(
  converted: number
): CommunityMilestone | null {
  for (const { threshold, milestone } of COMMUNITY_MILESTONES) {
    if (converted >= threshold) return milestone;
  }
  return null;
}

/**
 * Next milestone threshold above the current count.
 *
 * @param converted - Number of distinct converted referees.
 * @returns The next threshold, or null when the final milestone is reached.
 */
export function nextMilestoneTarget(converted: number): number | null {
  const next = Math.min(
    ...COMMUNITY_MILESTONES.filter(m => converted < m.threshold).map(
      m => m.threshold
    )
  );
  return Number.isFinite(next) ? next : null;
}
