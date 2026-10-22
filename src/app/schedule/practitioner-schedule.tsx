'use client';

import PageHeader from '@/components/page-header';
import SessionCard from '@/components/schedule/session-card';
import { useScheduleFilter } from '@/components/shared/hooks/useScheduleFilter';
import SchedulePageShell from '@/components/shared/schedule-page-shell';
import { getNow } from '@/constants/date';
import { useAuth } from '@/context/auth/authContext';
import { useDebounce } from '@/hooks/useDebounce';
import { IUseClinicParams } from '@/services/clinic';
import { useAppointments } from '@/services/hooks/useAppointments';
import { MergedSession } from '@/types/appointment';
import {
  mergeNames,
  parseMergedSessions
} from '@/utils/helper';
import { endOfDay } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  readonly fhirId: string;
};

/**
 *
 */
export default function PractitionerSchedule({ fhirId }: Props) {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get('start_date');
  const endDateParam = searchParams.get('end_date');

  const { state: authState } = useAuth();
  const [keyword, setKeyword] = useState<string>('');
  const [sessionsFilter, setSessionsFilter] = useState<IUseClinicParams>({});
  const [selectedTab, setSelectedTab] = useState('upcoming');

  const {
    data: pagesData,
    isLoading: isSessionLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useAppointments('Practitioner', fhirId);

  useEffect(() => {
    if (startDateParam && endDateParam) {
      const start = endOfDay(new Date(startDateParam));
      const end = endOfDay(new Date(endDateParam));

      const isPast = end < new Date(getNow().toDateString());
      setSelectedTab(isPast ? 'past' : 'upcoming');

      setSessionsFilter(prev => ({
        ...prev,
        start_date: start,
        end_date: end
      }));
    }
  }, [startDateParam, endDateParam]);

  const debouncedKeyword = useDebounce(keyword, 500);

  const parsedSessionsData = useMemo(() => {
    if (
      !pagesData?.pages ||
      pagesData.pages.length === 0 ||
      !authState.isAuthenticated
    )
      return null;

    const combined: import('fhir/r4').Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: pagesData.pages[0]?.total,
      entry: pagesData.pages.flatMap(p => p.entry ?? [])
    };

    return parseMergedSessions(combined);
  }, [pagesData, authState]);

  const { upcoming, past } = useScheduleFilter({
    data: parsedSessionsData,
    sessionsFilter,
    keyword: debouncedKeyword,
    keywordMatcher: (session: MergedSession, query: string) => {
      const fullName = mergeNames(session.patientName).toLowerCase();
      const email = session.patientEmail.toLowerCase();
      return (
        fullName.includes(query.toLowerCase()) ||
        email.includes(query.toLowerCase())
      );
    }
  });

  return (
    <>
      <PageHeader />
      <SchedulePageShell
        keyword={keyword}
        onKeywordChange={setKeyword}
        sessionsFilter={sessionsFilter}
        onFilterChange={(filter: IUseClinicParams) => {
          setSessionsFilter(prevState => ({
            ...prevState,
            ...filter
          }));
        }}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        isLoading={isSessionLoading}
        upcoming={upcoming}
        past={past}
        renderCard={(session: MergedSession) => (
          <SessionCard session={session} />
        )}
        onLoadMore={() => {
          fetchNextPage().catch(() => {
            /* ignore */
          });
        }}
        hasMore={hasNextPage}
        isLoadingMore={isFetchingNextPage}
      />
    </>
  );
}
