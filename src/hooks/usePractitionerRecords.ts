import { getAPI } from '@/services/api';
import type { IRecord } from '@/types/record';
import {
  mergeRecords,
  parseConditionBundle,
  parseObservationBundle,
  parseQRBundle
} from '@/utils/parse-searchset-bundles';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Bundle } from 'fhir/r4';
import { useCallback, useMemo } from 'react';
import type { UseRecordsResult } from './usePatientRecords';

const PAGE_SIZE = 10;

/**
 * Convert a Blaze absolute next URL into a relative path.
 */
function toFhirPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url.startsWith('/') ? url : `/${url}`;
  }
}

/** Base URL for a resource query with patient filter. */
function resourceQueryUrl(patientId: string, resourceType: string): string {
  return `/fhir/${resourceType}?patient=${patientId}&_count=${PAGE_SIZE}&_sort=-_lastUpdated`;
}

/** Build an infinite-query config for one FHIR resource type. */
function useResourceInfiniteQuery(
  patientId: string | null,
  resourceType: string,
  queryKeySuffix: string
) {
  return useInfiniteQuery<Bundle, Error>({
    queryKey: ['practitioner-records', patientId, queryKeySuffix] as const,
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const api = await getAPI();
      const url = pageParam ?? resourceQueryUrl(patientId, resourceType);
      const { data } = await api.get<Bundle>(url);
      return data;
    },
    getNextPageParam: (lastPage: Bundle): string | undefined => {
      const next = lastPage.link?.find(l => l.relation === 'next');
      if (!next?.url) return undefined;
      return toFhirPath(next.url);
    },
    enabled: Boolean(patientId)
  });
}

/**
 * Fetch patient records for practitioner view via 3 resource queries.
 *
 * Same as usePatientRecords but includes all QuestionnaireResponses
 * (including practitioner-authored SOAP notes).
 */
export function usePractitionerRecords(
  patientId: string | null
): UseRecordsResult {
  const qrQuery = useResourceInfiniteQuery(
    patientId,
    'QuestionnaireResponse',
    'qr'
  );
  const condQuery = useResourceInfiniteQuery(
    patientId,
    'Condition',
    'condition'
  );
  const obsQuery = useResourceInfiniteQuery(patientId, 'Observation', 'obs');

  const records = useMemo<IRecord[]>(() => {
    const qrRecords = (qrQuery.data?.pages ?? []).flatMap(p =>
      // Include all QRs (skipPractitionerAuthored: false) for practitioner view
      parseQRBundle(p, { skipPractitionerAuthored: false })
    );
    const condRecords = (condQuery.data?.pages ?? []).flatMap(p =>
      parseConditionBundle(p)
    );
    const obsRecords = (obsQuery.data?.pages ?? []).flatMap(p =>
      parseObservationBundle(p)
    );
    return mergeRecords(qrRecords, condRecords, obsRecords);
  }, [qrQuery.data, condQuery.data, obsQuery.data]);

  const fetchNextPage = useCallback(() => {
    if (qrQuery.hasNextPage) void qrQuery.fetchNextPage();
    if (condQuery.hasNextPage) void condQuery.fetchNextPage();
    if (obsQuery.hasNextPage) void obsQuery.fetchNextPage();
  }, [
    qrQuery.hasNextPage,
    qrQuery.fetchNextPage,
    condQuery.hasNextPage,
    condQuery.fetchNextPage,
    obsQuery.hasNextPage,
    obsQuery.fetchNextPage
  ]);

  const hasNextPage =
    qrQuery.hasNextPage || condQuery.hasNextPage || obsQuery.hasNextPage;

  const isFetchingNextPage =
    qrQuery.isFetchingNextPage ||
    condQuery.isFetchingNextPage ||
    obsQuery.isFetchingNextPage;

  const isLoading =
    qrQuery.isLoading || condQuery.isLoading || obsQuery.isLoading;

  return {
    records,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  };
}
