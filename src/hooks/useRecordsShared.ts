import { getAPI } from '@/services/api';
import { getProfileById } from '@/services/profile';
import type { IRecord } from '@/types/record';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Bundle, Patient, Person, Practitioner } from 'fhir/r4';
import type { Dispatch, SetStateAction } from 'react';

export const PAGE_SIZE = 10;

export type UseRecordsResult = {
  records: IRecord[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  titlesLoading: boolean;
  error: Error | null;
};

/** Convert a FHIR absolute URL to a relative path. */
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

/** Build a FHIR search URL for a resource type with optional date filters. */
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

/** Infinite query hook that paginates a FHIR resource search. */
export function useResourceInfiniteQuery(
  patientId: string | null,
  resourceType: string,
  queryKey: string,
  startDate?: string,
  endDate?: string
) {
  return useInfiniteQuery({
    queryKey: [queryKey, patientId, startDate, endDate] as const,
    queryFn: async ({ pageParam }) => {
      const api = await getAPI();
      const url =
        pageParam ??
        resourceQueryUrl(patientId, resourceType, startDate, endDate);
      const { data } = await api.get<Bundle>(url);
      return data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: Bundle): string | undefined => {
      const next = lastPage.link?.find(l => l.relation === 'next');
      if (!next?.url) return undefined;
      return toFhirPath(next.url);
    },
    enabled: patientId != null
  });
}

/** Options for enrichProfileData. */
export type EnrichProfileOptions = {
  queryClient: ReturnType<typeof useQueryClient>;
  setRecords: Dispatch<SetStateAction<IRecord[]>>;
  /** Callback returning true once the enclosing effect cleaned up. */
  isStale: () => boolean;
  /** Optional auth-bootstrap full profile of the record patient. */
  fullProfile?: Patient | Practitioner | Person;
};

/** Enrich records with practitioner and patient profile data from FHIR. */
export async function enrichProfileData(
  records: IRecord[],
  patientId: string,
  options: EnrichProfileOptions
): Promise<void> {
  const { queryClient, setRecords, isStale, fullProfile } = options;
  const uniqPracIds = [
    ...new Set(
      records
        .filter(r => r.type === 'PractitionerNote' && r.practitionerId)
        .map(r => r.practitionerId)
    )
  ];

  // The auth bootstrap already fetched the active role's full resource. When
  // it is the patient behind these records, reuse it instead of issuing a
  // duplicate profile fetch, and seed the cache for other consumers.
  let patientProfile: Patient;
  if (fullProfile?.resourceType === 'Patient' && fullProfile.id === patientId) {
    patientProfile = fullProfile;
    queryClient.setQueryData(['profile-patient', patientId], fullProfile);
  } else {
    patientProfile = await queryClient.fetchQuery<Patient>({
      queryKey: ['profile-patient', patientId],
      queryFn: () => getProfileById(patientId, 'Patient') as Promise<Patient>
    });
  }

  // Batch-fetch only the uncached practitioner profiles in a single search so
  // the record cards can show name + photo without one request per
  // practitioner, mirroring resolveQuestionnaireTitles. Records whose
  // practitioner has no match keep the existing fallback (no profile).
  const uncachedPracIds = uniqPracIds.filter(
    id => !queryClient.getQueryData(['profile-practitioner', id])
  );
  if (uncachedPracIds.length > 0) {
    const api = await getAPI();
    const url = `/fhir/Practitioner?_id=${uncachedPracIds.join(',')}&_elements=name,photo`;
    const { data } = await api.get<Bundle>(url);
    for (const entry of data.entry ?? []) {
      const practitioner = entry.resource as Practitioner | undefined;
      if (practitioner?.id) {
        queryClient.setQueryData(
          ['profile-practitioner', practitioner.id],
          practitioner
        );
      }
    }
  }

  const pracMap = new Map(
    uniqPracIds
      .map(id => {
        const profile = queryClient.getQueryData<Practitioner>([
          'profile-practitioner',
          id
        ]);
        return profile ? ([id, profile] as const) : undefined;
      })
      .filter((e): e is readonly [string, Practitioner] => e !== undefined)
  );

  if (isStale()) return;

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

/** No-op function for hooks that need a stable callback default. */
export const noop = (): void => undefined;
