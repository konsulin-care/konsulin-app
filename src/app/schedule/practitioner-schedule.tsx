'use client';

import Avatar from '@/components/general/avatar';
import PageHeader from '@/components/page-header';
import { useScheduleFilter } from '@/components/shared/hooks/useScheduleFilter';
import SchedulePageShell from '@/components/shared/schedule-page-shell';
import { getNow } from '@/constants/date';
import { useAuth } from '@/context/auth/authContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetAllSessions } from '@/services/api/appointments';
import { IUseClinicParams } from '@/services/clinic';
import { MergedSession } from '@/types/appointment';
import {
  generateAvatarPlaceholder,
  mergeNames,
  parseMergedSessions
} from '@/utils/helper';
import { capitalizeFirstLetter } from '@/utils/validation';
import { endOfDay, format, parseISO } from 'date-fns';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  readonly fhirId: string;
};

/** Card displaying a single session entry. */
const SessionCard = ({ session }: { session: MergedSession }) => {
  const sessionStartTime = session.slotStart
    ? format(parseISO(session.slotStart), 'HH:mm')
    : '-:-';
  const sessionDate = session.slotStart
    ? format(parseISO(session.slotStart), 'dd/MM/yyyy')
    : '-/-/-';
  const fullName = mergeNames(session.patientName);
  const displayName = fullName.trim() === '-' ? session.patientEmail : fullName;
  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id: session.patientId,
    name: displayName,
    email: session.patientEmail
  });
  const photoUrl = session.patientPhoto?.[0]?.url;

  return (
    <Link
      href={`/record?patientId=${session.patientId}`}
      className='card mt-4 flex flex-col gap-2 p-4'
    >
      <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
        {sessionStartTime} - {sessionDate}
      </div>

      <hr className='w-full' />
      <div className='flex items-center'>
        <Avatar
          seed={seed}
          initials={initials}
          backgroundColor={backgroundColor}
          photoUrl={photoUrl}
          className='mr-2 text-xs'
          imageClassName='mr-2 self-center'
          height={32}
          width={32}
        />
        <div className='mr-auto text-[12px] font-bold'>{displayName}</div>
        <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
          {capitalizeFirstLetter(session.appointmentType)} Session
        </div>
      </div>
    </Link>
  );
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

  const { data: sessionData, isLoading: isSessionLoading } = useGetAllSessions({
    practitionerId: fhirId
  });

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
    if (!sessionData || sessionData?.total === 0 || !authState.isAuthenticated)
      return null;

    const parsed = parseMergedSessions(sessionData);
    return parsed;
  }, [sessionData, authState]);

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
      />
    </>
  );
}
