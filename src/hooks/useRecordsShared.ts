import { getAPI } from '@/services/api';
import { getProfileById } from '@/services/profile';
import type { IRecord } from '@/types/record';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Bundle, Patient, Practitioner } from 'fhir/r4';
import type { Dispatch, SetStateAction } from 'react';

export const PAGE_SIZE = 10;

export type UseRecordsResult = {
  records: IRecord[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  titlesLoading: boolean;
};

/**
 *
 */
export function toFhirPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url.startsWith('/') ? url : `/${url}`;
  }
}

/** Append `_lastUpdated` date range to a FHIR query URL if dates are provided. */
export function appendDateParams(
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

/**
 *
 */
export function resourceQueryUrl(
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

/**
 *
 */
export function useResourceInfiniteQuery(
  patientId: string | null,
  resourceType: string,
  queryKey: string,
  startDate?: string,
  endDate?: string
) {
  return useInfiniteQuery<Bundle, Error>({
    queryKey: [queryKey, patientId, startDate, endDate] as const,
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
 *
 */
export async function enrichProfileData(
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

/**
 *
 */
export const noop = (): void => undefined;
