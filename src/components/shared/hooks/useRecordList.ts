'use client';

import { IRecordParams } from '@/app/record/record-filter';
import { useDebounce } from '@/hooks/useDebounce';
import { getProfileById } from '@/services/profile';
import { IRecord } from '@/types/record';
import { getTypeLabel, mergeNames } from '@/utils/helper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

type FetchApi = {
  readonly mutateAsync: (params: Record<string, string>) => Promise<unknown>;
};

interface UseRecordListConfig {
  readonly patientId: string | null;
  readonly queryKeyPrefix: string;
  readonly summaryApi: FetchApi;
  readonly filterApi: FetchApi;
  readonly parser: (data: unknown) => IRecord[];
  readonly profileTypes: string[];
  readonly isAuthLoading: boolean;
  readonly isSummaryLoading: boolean;
  readonly isFilterLoading: boolean;
  readonly queryMatcher?: (record: IRecord, query: string) => boolean;
}

/**
 *
 */
export function useRecordList({
  patientId,
  queryKeyPrefix,
  summaryApi,
  filterApi,
  parser,
  profileTypes,
  isAuthLoading,
  isSummaryLoading,
  isFilterLoading,
  queryMatcher
}: UseRecordListConfig) {
  const [recordFilter, setRecordFilter] = useState<IRecordParams>({
    query: ''
  });
  const [filteredRecords, setFilteredRecords] = useState<IRecord[] | null>(
    null
  );
  const [isFiltering, setIsFiltering] = useState<boolean>(true);
  const debouncedQuery = useDebounce(recordFilter.query, 500);
  const queryClient = useQueryClient();

  const filterTypeLabel = useMemo(
    () => getTypeLabel(recordFilter.type),
    [recordFilter.type]
  );

  const fetchRecords = useCallback(async () => {
    if (!patientId) return null;

    const result = recordFilter.isUseCustomDate
      ? await filterApi.mutateAsync({
          patientId,
          startDate: format(recordFilter.start_date, 'yyyy-MM-dd'),
          endDate: format(recordFilter.end_date, 'yyyy-MM-dd')
        })
      : await summaryApi.mutateAsync({ patientId });

    const parsed = parser(result);

    const attachProfile = await Promise.all(
      parsed.map(async item => {
        if (!profileTypes.includes(item.type)) return item;

        const practitionerProfile = await queryClient.fetchQuery({
          queryKey: ['profile-practitioner', item.practitionerId],
          queryFn: () => getProfileById(item.practitionerId, 'Practitioner')
        });

        return { ...item, practitionerProfile } as IRecord;
      })
    );

    return attachProfile;
  }, [
    patientId,
    recordFilter,
    filterApi,
    summaryApi,
    parser,
    profileTypes,
    queryClient
  ]);

  const { data: records, isLoading: isQueryLoading } = useQuery({
    queryKey: [
      queryKeyPrefix,
      patientId,
      recordFilter.isUseCustomDate,
      recordFilter.start_date,
      recordFilter.end_date
    ],
    queryFn: fetchRecords,
    enabled: Boolean(patientId),
    onError: (error: Error) => {
      toast.error(error.message);
      setIsFiltering(false);
    }
  });

  useEffect(() => {
    if (!records || records.length === 0) {
      setFilteredRecords([]);
      return;
    }

    setIsFiltering(true);

    const result = records
      .filter(record => {
        const { start_date, end_date, type } = recordFilter;

        const recordDate = format(parseISO(record.lastUpdated), 'yyyy-MM-dd');
        const startDate = start_date ? format(start_date, 'yyyy-MM-dd') : null;
        const endDate = end_date ? format(end_date, 'yyyy-MM-dd') : null;

        const matchesDateRange =
          (!startDate || recordDate >= startDate) &&
          (!endDate || recordDate <= endDate);

        const typeList = type?.split(',').map(t => t.trim());
        const matchesType =
          !type || type === 'All' || typeList.includes(record.type);

        const queryLower = debouncedQuery?.toLowerCase() || '';
        const matchesQuery = queryMatcher
          ? queryMatcher(record, queryLower)
          : !debouncedQuery ||
            (record.result as string)?.toLowerCase().includes(queryLower);

        return matchesDateRange && matchesType && matchesQuery;
      })
      .toSorted(
        (a, b) =>
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );

    setFilteredRecords(result);
    setIsFiltering(false);
  }, [records, recordFilter, debouncedQuery, queryMatcher]);

  const getPractitionerInfo = useCallback(
    (record: IRecord) => {
      const hasProfile = profileTypes.includes(record.type);
      if (!hasProfile) return { displayName: '', email: '' };

      const name = mergeNames(
        record.practitionerProfile?.name,
        record.practitionerProfile?.qualification
      );

      const email =
        record.practitionerProfile?.telecom.find(
          item => item.system === 'email'
        )?.value || '';

      return { displayName: name, email };
    },
    [profileTypes]
  );

  const handleSetRecordFilter = useCallback((key: string, value: string) => {
    setRecordFilter(prevState => ({
      ...prevState,
      [key]: value
    }));
  }, []);

  const isLoading =
    isAuthLoading ||
    isSummaryLoading ||
    isFilterLoading ||
    isFiltering ||
    isQueryLoading;

  return {
    records,
    filteredRecords,
    isLoading,
    isFiltering,
    recordFilter,
    filterTypeLabel,
    setRecordFilter,
    handleSetRecordFilter,
    getPractitionerInfo
  };
}
