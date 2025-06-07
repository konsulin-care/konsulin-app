'use client';

import Avatar from '@/components/general/avatar';
import BackButton from '@/components/general/back-button';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import NavigationBar from '@/components/navigation-bar';
import UpcomingSession from '@/components/schedule/upcoming-session';
import { Badge } from '@/components/ui/badge';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth/authContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetAllSessions } from '@/services/api/appointments';
import { IUseClinicParams } from '@/services/clinic';
import { MergedSession } from '@/types/appointment';
import {
  generateAvatarPlaceholder,
  mergeNames,
  parseMergedSessions,
  parseTime
} from '@/utils/helper';
import { capitalizeFirstLetter } from '@/utils/validation';
import {
  endOfDay,
  format,
  isAfter,
  isBefore,
  parse,
  parseISO,
  setHours,
  setMinutes,
  startOfDay
} from 'date-fns';
import { SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import SessionFilter from './session-filter';

const now = new Date();

type Props = {
  fhirId: string;
};

const SessionCard = ({ session }: { session: MergedSession }) => {
  const sessionStartTime = session.slotStart
    ? format(parseISO(session.slotStart), 'HH:mm')
    : '-:-';
  const sessionDate = session.slotStart
    ? format(parseISO(session.slotStart), 'dd/MM/yyyy')
    : '-/-/-';
  const fullName = mergeNames(session.patientName);
  const displayName = fullName.trim() === '-' ? session.patientEmail : fullName;
  const { initials, backgroundColor } = generateAvatarPlaceholder({
    id: session.patientId,
    name: displayName,
    email: session.patientEmail
  });
  const photoUrl = session.patientPhoto?.[0]?.url;

  return (
    <Link
      href={`/record/${session.patientId}`}
      className='card mt-4 flex flex-col gap-2 p-4'
    >
      <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
        {sessionStartTime} - {sessionDate}
      </div>

      <hr className='w-full' />
      <div className='flex items-center'>
        <Avatar
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

export default function SchedulePractitioner({ fhirId }: Props) {
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

  /* initialize the date filter based on dateParams */
  useEffect(() => {
    if (startDateParam && endDateParam) {
      const start = startOfDay(new Date(startDateParam));
      const end = endOfDay(new Date(endDateParam));

      const isPast = end < new Date(now.toDateString());
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

  const unfilteredSessionsData = useMemo(() => {
    if (!parsedSessionsData || parsedSessionsData.length === 0) return null;

    const filtered = parsedSessionsData.filter(session => {
      const slotStart = parseISO(session.slotStart);
      return isAfter(slotStart, now);
    });

    return filtered;
  }, [parsedSessionsData]);

  const filteredSessionsData = useMemo(() => {
    if (!parsedSessionsData || parsedSessionsData.length === 0) return null;

    const { start_date, end_date, start_time, end_time } = sessionsFilter;

    const hasDateFilter = !!start_date && !!end_date;
    const hasTimeFilter = !!start_time || !!end_time;

    const filterStartDate = start_date;
    const filterEndDate = end_date;

    const filterStartTime = start_time
      ? parseTime(start_time, 'HH:mm')
      : setHours(setMinutes(new Date(), 0), 0); // 00:00

    const filterEndTime = end_time
      ? parseTime(end_time, 'HH:mm')
      : setHours(setMinutes(new Date(), 59), 23); // 23:59

    return parsedSessionsData.filter(session => {
      if (!session.slotStart) return false;

      // parse full datetime from slotStart
      const sessionDate = parseISO(session.slotStart);

      // filter by date range
      if (
        hasDateFilter &&
        (isBefore(sessionDate, startOfDay(filterStartDate!)) ||
          isAfter(sessionDate, endOfDay(filterEndDate!)))
      ) {
        return false;
      }

      // filter by time range (extract only the time part)
      if (hasTimeFilter) {
        const sessionTimeOnly = parse(
          format(sessionDate, 'HH:mm'),
          'HH:mm',
          new Date()
        );

        if (
          isBefore(sessionTimeOnly, filterStartTime) ||
          isAfter(sessionTimeOnly, filterEndTime)
        ) {
          return false;
        }
      }

      // filter by patient's name or email
      const fullName = mergeNames(session.patientName).toLowerCase();
      const email = session.patientEmail.toLowerCase();

      if (
        debouncedKeyword &&
        !fullName.includes(debouncedKeyword.toLowerCase()) &&
        !email.includes(debouncedKeyword.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [parsedSessionsData, sessionsFilter, selectedTab, debouncedKeyword]);

  const listUpcomingSessions = useMemo(() => {
    if (!filteredSessionsData || filteredSessionsData.length === 0) return [];

    return filteredSessionsData
      .filter(s => s.slotStart && new Date(s.slotStart) >= now)
      .sort(
        (a, b) =>
          new Date(a.slotStart!).getTime() - new Date(b.slotStart!).getTime() // soonest first
      );
  }, [filteredSessionsData]);

  const listPastSessions = useMemo(() => {
    if (!filteredSessionsData || filteredSessionsData.length === 0) return [];

    return filteredSessionsData
      .filter(s => s.slotStart && new Date(s.slotStart) < now)
      .sort(
        (a, b) =>
          new Date(b.slotStart!).getTime() - new Date(a.slotStart!).getTime() // most-recent first
      );
  }, [filteredSessionsData]);

  const TabUpcomingSession = () => {
    return (
      <>
        {!listUpcomingSessions || listUpcomingSessions.length === 0 ? (
          <EmptyState
            className='py-16'
            title='No Upcoming Sessions'
            subtitle='You have no scheduled sessions at the moment'
          />
        ) : (
          listUpcomingSessions.map((session: MergedSession) => (
            <SessionCard key={session.appointmentId} session={session} />
          ))
        )}
      </>
    );
  };

  const TabPastSession = () => {
    return (
      <>
        {!listPastSessions || listPastSessions.length === 0 ? (
          <EmptyState
            className='py-16'
            title='No Past Sessions'
            subtitle='You haven’t completed any sessions yet'
          />
        ) : (
          listPastSessions.map((session: MergedSession) => (
            <SessionCard key={session.appointmentId} session={session} />
          ))
        )}
      </>
    );
  };

  return (
    <>
      <NavigationBar />
      <Header>
        <div className='flex w-full flex-col'>
          <div className='flex items-center'>
            <BackButton />
            <span className='text-[14px] font-bold text-white'>
              Scheduled Session
            </span>
          </div>

          {authState &&
            unfilteredSessionsData &&
            unfilteredSessionsData.length > 0 && (
              <UpcomingSession
                data={unfilteredSessionsData}
                role={authState.userInfo.role_name}
              />
            )}
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white pb-[100px]'>
        <div className='w-full p-4'>
          <div className='flex gap-4'>
            <InputWithIcon
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder='Search'
              className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <SessionFilter
              onChange={(filter: IUseClinicParams) => {
                setSessionsFilter(prevState => ({
                  ...prevState,
                  ...filter
                }));
              }}
              type={selectedTab}
              initialFilter={sessionsFilter}
            />
          </div>

          <div className='mb-4 flex gap-4'>
            {sessionsFilter.start_date && sessionsFilter.end_date && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {format(new Date(sessionsFilter.start_date), 'dd MMM yy') +
                  ' - ' +
                  format(new Date(sessionsFilter.end_date), 'dd MMM yy')}
              </Badge>
            )}
            {sessionsFilter.start_time && sessionsFilter.end_time && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {sessionsFilter.start_time + ' - ' + sessionsFilter.end_time}
              </Badge>
            )}
          </div>

          <Tabs
            defaultValue='upcoming'
            className='w-full'
            value={selectedTab}
            onValueChange={value => setSelectedTab(value)}
          >
            <TabsList className='grid w-full grid-cols-2 bg-transparent'>
              <TabsTrigger
                className='rounded-none border-secondary data-[state=active]:border-b-2 data-[state=active]:font-bold data-[state=active]:text-secondary data-[state=active]:shadow-none'
                value='upcoming'
              >
                Upcoming Session
              </TabsTrigger>
              <TabsTrigger
                className='rounded-none border-secondary data-[state=active]:border-b-2 data-[state=active]:font-bold data-[state=active]:text-secondary data-[state=active]:shadow-none'
                value='past'
              >
                Past Session
              </TabsTrigger>
            </TabsList>
            {isSessionLoading ? (
              <Skeleton
                count={4}
                className='mt-4 h-[100px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]'
              />
            ) : (
              <>
                <TabsContent value='upcoming'>
                  <TabUpcomingSession />
                </TabsContent>
                <TabsContent value='past'>
                  <TabPastSession />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>
    </>
  );
}
