'use client';

import PageHeader from '@/components/page-header';
import RecordCard from '@/components/shared/record-card';
import { Badge } from '@/components/ui/badge';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { typeMappings } from '@/constants/record';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { usePatientRecords } from '@/hooks/usePatientRecords';
import { usePractitionerRecords } from '@/hooks/usePractitionerRecords';
import { useSearchWithFallback } from '@/hooks/useSearchWithFallback';
import type { IRecord } from '@/types/record';
import { format } from 'date-fns';
import { SearchIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import type { IRecordParams } from './record-filter';
import RecordFilter from './record-filter';

type Props = {
  readonly patientId: string;
};

/** Date range badge content. */
function DateBadgeContent({
  start,
  end
}: Readonly<{ start: Date; end: Date }>) {
  if (start === end) return <>{format(start, 'dd MMM yy')}</>;
  return (
    <>
      {format(start, 'dd MMM yy')} - {format(end, 'dd MMM yy')}
    </>
  );
}
/** Flatten a FHIR value field into a display string. */
function flattenResult(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    return (v as Array<{ value?: string }>).map(s => s.value ?? '').join(' ');
  }
  return '';
}

/** Shared page header used by all render branches. */
function TimelineHeader() {
  return <PageHeader pageIndicator='Personal Health Records' />;
}

/** Skeleton shown while records are loading. */
function TimelineSkeleton() {
  return (
    <div data-testid='timeline-skeleton'>
      <TimelineHeader />
      <div
        data-testid='timeline-overlay'
        className='mt-[-24px] min-h-screen overflow-x-hidden rounded-b-[16px] bg-white pb-20'
      >
        <div className='flex flex-col gap-2 p-4'>
          <Skeleton className='h-[80px] w-full' />
          <Skeleton className='h-[80px] w-full' />
          <Skeleton className='h-[80px] w-full' />
        </div>
      </div>
    </div>
  );
}

/** Empty state when no records exist. */
function TimelineEmpty() {
  return (
    <>
      <TimelineHeader />
      <div
        data-testid='timeline-overlay'
        className='mt-[-24px] min-h-screen overflow-x-hidden rounded-b-[16px] bg-white pb-20'
      >
        <div className='flex flex-col items-center justify-center py-16'>
          <p className='text-muted-foreground'>No records found</p>
        </div>
      </div>
    </>
  );
}

/**
 * Timeline view of patient records with search bar and filter drawer.
 *
 * Replaces the old toggle pills with a search+filter pattern matching /clinic.
 */
export default function RecordTimeline({ patientId }: Props) {
  const { state: authState } = useAuth();
  const isPatient = authState.userInfo?.role_name === Roles.Patient;

  const [filterParams, setFilterParams] = useState<IRecordParams>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract date params for server-side filtering
  const startDate = filterParams.start_date
    ? format(filterParams.start_date, 'yyyy-MM-dd')
    : undefined;
  const endDate = filterParams.end_date
    ? format(filterParams.end_date, 'yyyy-MM-dd')
    : undefined;

  const patientHook = usePatientRecords(
    isPatient ? patientId : null,
    startDate,
    endDate
  );
  const practitionerHook = usePractitionerRecords(
    isPatient ? null : patientId,
    startDate,
    endDate
  );

  const {
    records,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    titlesLoading
  } = isPatient ? patientHook : practitionerHook;

  const sentinelRef = useInfiniteScroll<HTMLDivElement>(fetchNextPage, {
    enabled: hasNextPage && !isFetchingNextPage
  });

  // ---- Client-side type filter ----
  const selectedTypes = useMemo(
    () => filterParams.type ?? [],
    [filterParams.type]
  );
  const typeFilteredRecords = useMemo(
    () =>
      selectedTypes.length === 0
        ? records
        : records.filter(r => selectedTypes.includes(r.type)),
    [records, selectedTypes]
  );

  // ---- Client-side search ----
  const serverSearch = useCallback(() => Promise.resolve([] as IRecord[]), []);

  const { filteredData: searchedRecords } = useSearchWithFallback({
    data: typeFilteredRecords,
    searchFields: [
      { path: 'title' },
      { path: 'result', transform: flattenResult },
      { path: 'practitionerProfile.name' }
    ],
    serverSearchFunction: serverSearch,
    searchTerm,
    debounceDelay: 1000
  });

  /** Active filter label for a record type code. */
  const typeBadgeLabel = (code: string): string =>
    typeMappings[code]?.text ?? code;

  /** Handle filter drawer change — store the params. */
  const handleFilterChange = useCallback((filter: IRecordParams) => {
    setFilterParams(filter);
  }, []);

  /** Clear a single badge by field. */
  const clearBadge = useCallback((field: string, code?: string) => {
    setFilterParams(prev => {
      if (field === 'type' && code) {
        const next = (prev.type ?? []).filter(c => c !== code);
        return { ...prev, type: next.length > 0 ? next : undefined };
      }
      if (field === 'date') {
        return {
          ...prev,
          start_date: undefined,
          end_date: undefined
        };
      }
      return prev;
    });
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      (filterParams.type && filterParams.type.length > 0) ||
      Boolean(filterParams.start_date) ||
      Boolean(filterParams.end_date),
    [filterParams.type, filterParams.start_date, filterParams.end_date]
  );

  const displayRecords = useMemo(
    () => (searchTerm ? searchedRecords : typeFilteredRecords),
    [searchTerm, searchedRecords, typeFilteredRecords]
  );

  // ---- Loading state ----
  if (isLoading) {
    return <TimelineSkeleton />;
  }

  // ---- Empty state ----
  if (records.length === 0) {
    return <TimelineEmpty />;
  }

  // ---- Normal render ----
  return (
    <>
      <PageHeader pageIndicator='Personal Health Records' />

      <div
        data-testid='timeline-overlay'
        className='mt-[-24px] min-h-screen overflow-x-hidden rounded-b-[16px] bg-white pb-20'
      >
        <div className='w-full p-4'>
          {/* Search + Filter row */}
          <div className='flex gap-4'>
            <InputWithIcon
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder='Search records'
              className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <RecordFilter onChange={handleFilterChange} />
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className='flex flex-wrap gap-2'>
              {selectedTypes.map(code => (
                <Badge
                  key={code}
                  className='bg-secondary cursor-pointer rounded-md px-4 py-[3px] font-normal text-white'
                  onClick={() => clearBadge('type', code)}
                >
                  {typeBadgeLabel(code)}
                </Badge>
              ))}
              {filterParams.start_date && filterParams.end_date && (
                <Badge
                  className='bg-secondary cursor-pointer rounded-md px-4 py-[3px] font-normal text-white'
                  onClick={() => clearBadge('date')}
                >
                  <DateBadgeContent
                    start={filterParams.start_date}
                    end={filterParams.end_date}
                  />
                </Badge>
              )}
            </div>
          )}

          {/* Records list */}
          <div className='flex flex-col gap-4'>
            {displayRecords.map(record => (
              <div key={record.id} className='group'>
                <RecordCard
                  record={record}
                  patientId={patientId}
                  titlesLoading={titlesLoading}
                />
              </div>
            ))}
          </div>

          {/* Loading indicator for next page */}
          {isFetchingNextPage && (
            <div className='flex justify-center py-4'>
              <Skeleton className='h-[60px] w-full max-w-md' />
            </div>
          )}

          {/* Sentinel for infinite scroll */}
          {hasNextPage && <div ref={sentinelRef} className='h-1 w-full' />}
        </div>
      </div>
    </>
  );
}
