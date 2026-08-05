import { getAPI } from '@/services/api';
import { useQuery } from '@tanstack/react-query';

/**
 * Fetch a single FHIR resource by resource type and ID.
 *
 * Returns the raw FHIR resource data. Consumer components handle
 * type-specific rendering based on the resource's content.
 */
export function useRecordDetail(
  resourceType: string,
  resourceId: string | null
) {
  return useQuery<Record<string, unknown>>({
    queryKey: ['record-detail', resourceType, resourceId],
    queryFn: async () => {
      const api = await getAPI();
      const { data } = await api.get<Record<string, unknown>>(
        `/fhir/${resourceType}/${resourceId}`
      );
      return data;
    },
    enabled: Boolean(resourceType) && Boolean(resourceId)
  });
}
