import type { IRecord } from '@/types/record';
import {
  mergeRecords,
  parseConditionBundle,
  parseObservationBundle,
  parseQRBundle
} from '@/utils/parse-searchset-bundles';
import { resolveQuestionnaireTitles } from '@/utils/resolve-questionnaire-titles';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  enrichProfileData,
  noop,
  useResourceInfiniteQuery,
  type UseRecordsResult
} from './useRecordsShared';

export interface UseRecordsConfig {
  queryKeyPrefix: string;
  skipPractitionerAuthored: boolean;
  enrichProfiles: boolean;
}

/**
 * Shared internal hook for fetching patient/practitioner records.
 *
 * Drives 3 parallel FHIR resource queries (QuestionnaireResponse, Condition,
 * Observation), merges results, resolves questionnaire titles, and optionally
 * enriches records with practitioner/patient profile data.
 *
 * @param patientId - Patient FHIR ID, or null to disable queries
 * @param config - Behaviour flags for the two consumer hooks
 * @param startDate - Optional ISO date for `_lastUpdated=ge` filter
 * @param endDate - Optional ISO date for `_lastUpdated=le` filter
 */
export function useRecords(
  patientId: string | null,
  config: UseRecordsConfig,
  startDate?: string,
  endDate?: string
): UseRecordsResult {
  const queryClient = useQueryClient();
  const { queryKeyPrefix, skipPractitionerAuthored, enrichProfiles } = config;

  const qrQuery = useResourceInfiniteQuery(
    patientId,
    'QuestionnaireResponse',
    `${queryKeyPrefix}-qr`,
    startDate,
    endDate
  );
  const condQuery = useResourceInfiniteQuery(
    patientId,
    'Condition',
    `${queryKeyPrefix}-condition`,
    startDate,
    endDate
  );
  const obsQuery = useResourceInfiniteQuery(
    patientId,
    'Observation',
    `${queryKeyPrefix}-obs`,
    startDate,
    endDate
  );

  const mergedRecords = useMemo<IRecord[]>(() => {
    const qrRecords = (qrQuery.data?.pages ?? []).flatMap(p =>
      parseQRBundle(p, { skipPractitionerAuthored })
    );
    const condRecords = (condQuery.data?.pages ?? []).flatMap(p =>
      parseConditionBundle(p)
    );
    const obsRecords = (obsQuery.data?.pages ?? []).flatMap(p =>
      parseObservationBundle(p)
    );
    return mergeRecords(qrRecords, condRecords, obsRecords);
  }, [qrQuery.data, condQuery.data, obsQuery.data, skipPractitionerAuthored]);

  const [records, setRecords] = useState<IRecord[]>([]);

  useEffect(() => {
    setRecords(mergedRecords);
    if (mergedRecords.length === 0 || !patientId) return noop;

    let stale = false;

    async function enrich(): Promise<void> {
      let withTitles = mergedRecords;
      try {
        withTitles = await resolveQuestionnaireTitles(mergedRecords, {
          queryClient
        });
      } catch {
        // title resolution is best-effort
      }
      if (stale) return;
      setTitlesLoading(false);

      if (enrichProfiles) {
        await enrichProfileData(
          withTitles,
          patientId,
          queryClient,
          setRecords,
          () => stale
        );
      } else {
        setRecords(withTitles);
      }
    }

    void enrich().catch(() => {
      /* enrichment is best-effort */
    });

    return function cleanup(): void {
      stale = true;
    };
  }, [mergedRecords, patientId, queryClient, enrichProfiles]);

  const fetchNextPage = useCallback(
    function fetchNextPage(): void {
      if (qrQuery.hasNextPage) void qrQuery.fetchNextPage();
      if (condQuery.hasNextPage) void condQuery.fetchNextPage();
      if (obsQuery.hasNextPage) void obsQuery.fetchNextPage();
    },
    [qrQuery, condQuery, obsQuery]
  );

  const hasNextPage =
    qrQuery.hasNextPage || condQuery.hasNextPage || obsQuery.hasNextPage;

  const isFetchingNextPage =
    qrQuery.isFetchingNextPage ||
    condQuery.isFetchingNextPage ||
    obsQuery.isFetchingNextPage;

  const isLoading =
    qrQuery.isLoading || condQuery.isLoading || obsQuery.isLoading;

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
    isLoading: patientId ? isLoading : false,
    titlesLoading: patientId ? titlesLoading : false
  };
}
