'use client';

import PageHeader from '@/components/page-header';
import RecordCard from '@/components/shared/record-card';
import { Skeleton } from '@/components/ui/skeleton';
import { typeMappings } from '@/constants/record';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { usePatientRecords } from '@/hooks/usePatientRecords';
import { usePractitionerRecords } from '@/hooks/usePractitionerRecords';
import type { IRecord } from '@/types/record';
import { useCallback, useMemo, useState } from 'react';

type Props = {
  patientId: string;
};

/** Category group derived from record types present in data. */
type CategoryGroup = {
  type: string;
  label: string;
};

/**
 * Build category groups from records, preserving display order.
 */
function buildGroups(records: IRecord[]): CategoryGroup[] {
  const seen = new Set<string>();
  const groups: CategoryGroup[] = [];

  for (const r of records) {
    if (seen.has(r.type)) continue;
    seen.add(r.type);
    groups.push({
      type: r.type,
      label: typeMappings[r.type]?.text ?? r.type
    });
  }

  return groups;
}

/**
 * Timeline view of patient records with shared PageHeader and
 * category-filtered record list.
 */
export default function RecordTimeline({ patientId }: Props) {
  const { state: authState } = useAuth();
  const isPatient = authState.userInfo?.role_name === Roles.Patient;

  const patientHook = usePatientRecords(isPatient ? patientId : null);
  const practitionerHook = usePractitionerRecords(isPatient ? null : patientId);

  const {
    records,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    titlesLoading
  } = isPatient ? patientHook : practitionerHook;

  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

  const groups = useMemo(() => buildGroups(records), [records]);

  const toggleType = useCallback((type: string) => {
    setHiddenTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const sentinelRef = useInfiniteScroll<HTMLDivElement>(fetchNextPage, {
    enabled: hasNextPage && !isFetchingNextPage
  });

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div data-testid='timeline-skeleton'>
        <PageHeader pageIndicator='Personal Health Records' />
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

  // ---- Empty state ----
  if (records.length === 0) {
    return (
      <>
        <PageHeader pageIndicator='Personal Health Records' />
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

  const filteredRecords = records.filter(r => !hiddenTypes.has(r.type));

  // ---- Normal render ----
  return (
    <>
      <PageHeader pageIndicator='Personal Health Records' />

      <div
        data-testid='timeline-overlay'
        className='mt-[-24px] min-h-screen overflow-x-hidden rounded-b-[16px] bg-white pb-20'
      >
        {/* Category filter pills */}
        {groups.length > 1 && (
          <div className='flex flex-wrap gap-2 px-4 pb-3'>
            {groups.map(g => (
              <button
                key={g.type}
                onClick={() => toggleType(g.type)}
                data-active={!hiddenTypes.has(g.type)}
                className='data-[active=true]:bg-primary data-[active=false]:bg-muted data-[active=false]:text-muted-foreground rounded-full px-3 py-1 text-xs font-medium transition-colors data-[active=true]:text-white'
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {/* Grouped records */}
        <div className='flex flex-col gap-4 px-4 pb-4'>
          {filteredRecords.map(record => (
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
    </>
  );
}
