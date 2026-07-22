import { getAPI } from '@/services/api';
import type { IRecord } from '@/types/record';
import {
  mergeRecords,
  parseConditionBundle,
  parseObservationBundle,
  parseQRBundle
} from '@/utils/parse-searchset-bundles';
import { resolveQuestionnaireTitles } from '@/utils/resolve-questionnaire-titles';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Bundle } from 'fhir/r4';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UseRecordsResult } from './usePatientRecords';

const PAGE_SIZE = 10;
const noop = (): void => undefined;

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

/** Append `_lastUpdated` date range to a FHIR query URL if dates are provided. */
function appendDateParams(
  url: string,
  startDate?: string,
  endDate?: string
): string {
  let result = url;
  if (startDate) {
    result += `&_lastUpdated=ge${startDate}`;
  }
  if (endDate) {
    result += `&_lastUpdated=le${endDate}`;
  }
  return result;
}

/** Base URL for a resource query with patient filter. */
function resourceQueryUrl(
  patientId: string,
  resourceType: string,
  startDate?: string,
  endDate?: string
): string {
  const base = `/fhir/${resourceType}?patient=${patientId}&_count=${PAGE_SIZE}&_sort=-_lastUpdated`;
  const withCodes =
    resourceType === 'Observation'
      ? `${base}&code=http://loinc.org|67855-7,51855-5`
      : base;
  return appendDateParams(withCodes, startDate, endDate);
}

/** Build an infinite-query config for one FHIR resource type. */
function useResourceInfiniteQuery(
  patientId: string | null,
  resourceType: string,
  queryKeySuffix: string,
  startDate?: string,
  endDate?: string
) {
  return useInfiniteQuery<Bundle, Error>({
    queryKey: [
      'practitioner-records',
      patientId,
      queryKeySuffix,
      startDate,
      endDate
    ] as const,
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const api = await getAPI();
      const url =
        pageParam ??
        resourceQueryUrl(patientId, resourceType, startDate, endDate);
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
 *
 * @param patientId - Patient FHIR ID, or null to disable
 * @param startDate - ISO date string for `_lastUpdated=ge` filter
 * @param endDate - ISO date string for `_lastUpdated=le` filter
 */
export function usePractitionerRecords(
  patientId: string | null,
  startDate?: string,
  endDate?: string
): UseRecordsResult {
  const queryClient = useQueryClient();

  const qrQuery = useResourceInfiniteQuery(
    patientId,
    'QuestionnaireResponse',
    'qr',
    startDate,
    endDate
  );
  const condQuery = useResourceInfiniteQuery(
    patientId,
    'Condition',
    'condition',
    startDate,
    endDate
  );
  const obsQuery = useResourceInfiniteQuery(
    patientId,
    'Observation',
    'obs',
    startDate,
    endDate
  );

  const mergedRecords = useMemo<IRecord[]>(() => {
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

  const [records, setRecords] = useState<IRecord[]>([]);

  useEffect(() => {
    setRecords(mergedRecords);

    if (mergedRecords.length === 0 || !patientId) return noop;

    let stale = false;

    async function enrich(): Promise<void> {
      try {
        const withTitles = await resolveQuestionnaireTitles(mergedRecords, {
          queryClient
        });
        if (!stale) {
          setRecords(withTitles);
          setTitlesLoading(false);
        }
      } catch {
        if (!stale) setTitlesLoading(false);
      }
    }

    void enrich();

    return function cleanup(): void {
      stale = true;
    };
  }, [mergedRecords, patientId, queryClient]);

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

  // Tracks whether questionnaire titles are still being resolved
  const [titlesLoading, setTitlesLoading] = useState(false);

  useEffect(() => {
    if (mergedRecords.length === 0 || !patientId) {
      setTitlesLoading(false);
      return;
    }

    const hasUnresolved = mergedRecords.some(
      r =>
        r.type === 'QuestionnaireResponse' &&
        r.title.startsWith('Questionnaire/')
    );
    setTitlesLoading(hasUnresolved);
  }, [mergedRecords, patientId]);

  return {
    records: patientId ? records : [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: Boolean(patientId) ? isLoading : false,
    titlesLoading: patientId ? titlesLoading : false
  };
}
