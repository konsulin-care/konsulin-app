import { getAPI } from '@/services/api';
import { getProfileById } from '@/services/profile';
import type { IRecord } from '@/types/record';
import {
  mergeRecords,
  parseConditionBundle,
  parseObservationBundle,
  parseQRBundle
} from '@/utils/parse-searchset-bundles';
import { resolveQuestionnaireTitles } from '@/utils/resolve-questionnaire-titles';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Bundle, Patient, Practitioner } from 'fhir/r4';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 10;

export type UseRecordsResult = {
  records: IRecord[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  titlesLoading: boolean;
};

function toFhirPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url.startsWith('/') ? url : `/${url}`;
  }
}

function resourceQueryUrl(patientId: string, resourceType: string): string {
  return `/fhir/${resourceType}?patient=${patientId}&_count=${PAGE_SIZE}&_sort=-_lastUpdated`;
}

function useResourceInfiniteQuery(
  patientId: string | null,
  resourceType: string,
  queryKeySuffix: string
) {
  return useInfiniteQuery<Bundle, Error>({
    queryKey: ['patient-records', patientId, queryKeySuffix] as const,
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

async function enrichProfileData(
  records: IRecord[],
  patientId: string,
  queryClient: ReturnType<typeof useQueryClient>,
  setRecords: Dispatch<SetStateAction<IRecord[]>>,
  isStale: () => boolean
): Promise<void> {
  const uniqPracIds = [
    ...new Set(
      records
        .filter(r => r.type === 'PractitionerNote' && r.practitionerId)
        .map(r => r.practitionerId)
    )
  ];

  const patientProfile = await queryClient.fetchQuery<Patient>({
    queryKey: ['profile-patient', patientId],
    queryFn: () => getProfileById(patientId, 'Patient') as Promise<Patient>
  });

  const pracProfiles = await Promise.all(
    uniqPracIds.map(id =>
      queryClient.fetchQuery<Practitioner>({
        queryKey: ['profile-practitioner', id],
        queryFn: () =>
          getProfileById(id, 'Practitioner') as Promise<Practitioner>
      })
    )
  );

  if (isStale()) return;

  const pracMap = new Map(uniqPracIds.map((id, i) => [id, pracProfiles[i]]));

  setRecords(
    records.map(r => ({
      ...r,
      practitionerProfile:
        r.type === 'PractitionerNote' && r.practitionerId
          ? (pracMap.get(r.practitionerId) ?? undefined)
          : undefined,
      patientProfile:
        r.type === 'PatientNote' ? (patientProfile ?? undefined) : undefined
    }))
  );
}

const noop = (): void => undefined;

/**
 *
 */
export function usePatientRecords(patientId: string | null): UseRecordsResult {
  const queryClient = useQueryClient();

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

  const mergedRecords = useMemo<IRecord[]>(() => {
    const qrRecords = (qrQuery.data?.pages ?? []).flatMap(p =>
      parseQRBundle(p, { skipPractitionerAuthored: true })
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
      // Step 1: resolve questionnaire titles
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

      // Step 2: enrich with practitioner profiles
      await enrichProfileData(
        withTitles,
        patientId,
        queryClient,
        setRecords,
        () => stale
      );
    }

    void enrich().catch(() => {
      /* enrichment is best-effort */
    });

    return function cleanup(): void {
      stale = true;
    };
  }, [mergedRecords, patientId, queryClient]);

  const fetchNextPage = useCallback(
    function fetchNextPage(): void {
      if (qrQuery.hasNextPage) void qrQuery.fetchNextPage();
      if (condQuery.hasNextPage) void condQuery.fetchNextPage();
      if (obsQuery.hasNextPage) void obsQuery.fetchNextPage();
    },
    [
      qrQuery.hasNextPage,
      qrQuery.fetchNextPage,
      condQuery.hasNextPage,
      condQuery.fetchNextPage,
      obsQuery.hasNextPage,
      obsQuery.fetchNextPage
    ]
  );

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
    records,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    titlesLoading
  };
}
