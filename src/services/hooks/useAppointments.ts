import { getAPI } from '@/services/api';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Bundle } from 'fhir/r4';

type Role = 'Patient' | 'Practitioner';

/**
 * Fetch paginated appointments for a patient or practitioner.
 *
 * Uses infinite query with `_count=10` and `_sort=-_lastUpdated`.
 * Reads `Bundle.link[rel=next]` for cursor-based pagination.
 * Includes related resources via `_include`.
 *
 * @param role - 'Patient' or 'Practitioner'
 * @param fhirId - FHIR resource ID of the actor
 * @returns Infinite query result with paginated appointment bundles
 */
export function useAppointments(role: Role, fhirId: string) {
  const includeParams =
    role === 'Patient'
      ? [
          '_include=Appointment:slot',
          '_include=Appointment:actor:PractitionerRole',
          '_include:iterate=PractitionerRole:practitioner'
        ]
      : ['_include=Appointment:slot', '_include=Appointment:actor:Patient'];

  return useInfiniteQuery<Bundle, Error>({
    queryKey: ['appointments', role, fhirId],
    queryFn: async ({ pageParam }) => {
      const API = await getAPI();
      const baseParams = [
        `actor=${role}/${fhirId}`,
        '_count=10',
        '_sort=-_lastUpdated',
        ...includeParams
      ];
      if (pageParam) {
        baseParams.push(`pageToken=${String(pageParam)}`);
      }
      const url = `/fhir/Appointment?${baseParams.join('&')}`;
      const response = await API.get<Bundle>(url);
      return response.data;
    },
    getNextPageParam: lastPage => {
      const nextLink = lastPage.link?.find(l => l.relation === 'next');
      return nextLink?.url
        ? (new URL(nextLink.url, 'http://localhost').searchParams.get(
            'pageToken'
          ) ?? undefined)
        : undefined;
    },
    enabled: Boolean(fhirId)
  });
}
