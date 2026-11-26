import { useQuery } from '@tanstack/react-query';
import type { Organization } from 'fhir/r4';
import { getAPI } from '../api';

/**
 * Fetches the display name of an Organization.
 *
 * Issues `GET /fhir/Organization/{id}` and returns `Organization.name`.
 * The query stays disabled while no organization id is given.
 *
 * @param organizationId - Organization id, or undefined to skip the request.
 * @returns React Query result whose data is the organization name.
 */
export function useOrganizationName(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-name', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<string> => {
      const API = await getAPI();
      const { data } = await API.get<Organization>(
        `/fhir/Organization/${organizationId}`
      );
      return data.name ?? '';
    }
  });
}
