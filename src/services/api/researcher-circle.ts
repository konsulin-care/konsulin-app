'use client';

import { useQuery } from '@tanstack/react-query';
import type { Bundle, Communication } from 'fhir/r4';
import { getAPI } from '../api';

/** Referral stats for a researcher (sender is the participant, recipient is the researcher). */
export interface ResearcherReferralStats {
  /** Number of distinct participants who enrolled via the researcher's share link. */
  referralCount: number;
}

/**
 * Derives referral stats from Communications where the researcher is the
 * recipient (participant enrolled via researcher's link).
 *
 * @param communications - The referral Communications.
 * @returns Count of distinct senders (participants).
 */
export function deriveResearcherReferralStats(
  communications: Communication[]
): ResearcherReferralStats {
  const senders = new Set<string>();
  for (const comm of communications) {
    const ref = comm.sender?.reference;
    if (ref) senders.add(ref);
  }
  return { referralCount: senders.size };
}

/**
 * Fetches the researcher's referral Communications (recipient = the researcher,
 * topic = research-referral) and derives referral stats.
 *
 * @param practitionerId - The practitioner's FHIR id, or undefined to skip.
 * @returns React Query result with referral count.
 */
export function useResearcherReferralStats(practitionerId: string | undefined) {
  return useQuery({
    queryKey: ['researcher-referral-stats', practitionerId ?? 'none'],
    enabled: Boolean(practitionerId),
    staleTime: 15 * 60_000,
    queryFn: async (): Promise<ResearcherReferralStats> => {
      const API = await getAPI();
      const response = await API.get<Bundle<Communication>>(
        `/fhir/Communication?recipient=Practitioner/${practitionerId}&topic=research-referral&_elements=sender&_count=500`
      );
      const communications = (response.data.entry ?? [])
        .map(entry => entry.resource)
        .filter(
          (resource): resource is Communication =>
            resource?.resourceType === 'Communication'
        );
      return deriveResearcherReferralStats(communications);
    }
  });
}
