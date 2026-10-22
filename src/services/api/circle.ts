import { deriveCircleStats, type CircleStats } from '@/utils/circle-stats';
import { useQuery } from '@tanstack/react-query';
import type { Bundle, Communication } from 'fhir/r4';
import { getAPI } from '../api';

/**
 * Fetches the current user's referral Communications (sender = the user,
 * topic = research-referral) and derives circle stats: distinct referees who
 * completed a batch through the user's link.
 *
 * Disabled when no fhirId is provided (guests have no circle to credit).
 *
 * @param fhirId - The patient's FHIR id.
 * @returns React Query result with joined/converted counts.
 */
export function useCircleStats(fhirId?: string) {
  return useQuery({
    queryKey: ['circle-stats', fhirId ?? 'none'],
    enabled: Boolean(fhirId),
    staleTime: 15 * 60_000,
    queryFn: async (): Promise<CircleStats> => {
      const API = await getAPI();
      const response = await API.get<Bundle<Communication>>(
        `/fhir/Communication?sender=Patient/${fhirId}&topic=research-referral&_elements=recipient&_count=500`
      );
      const communications = (response.data.entry ?? [])
        .map(entry => entry.resource)
        .filter(
          (resource): resource is Communication =>
            resource?.resourceType === 'Communication'
        );
      return deriveCircleStats(communications);
    }
  });
}
