'use client';

import Avatar from '@/components/general/avatar';
import BackButton from '@/components/general/back-button';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import NavigationBar from '@/components/navigation-bar';
import UpcomingSession from '@/components/schedule/upcoming-session';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth/authContext';
import { useGetAllAppointments } from '@/services/api/appointments';
import { IUseClinicParams } from '@/services/clinic';
import { MergedAppointment } from '@/types/appointment';
import {
  generateAvatarPlaceholder,
  mergeNames,
  parseMergedAppointments,
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
import { useEffect, useMemo, useState } from 'react';
import SessionFilter from './session-filter';

const now = new Date();

export default function Schedule() {
  const [keyword, setKeyword] = useState<string>('');
  const [sessionsFilter, setSessionsFilter] = useState<IUseClinicParams>({});
  const [selectedTab, setSelectedTab] = useState('upcoming');

  const { state: authState } = useAuth();
  const { data: upcomingData, isLoading: isUpcomingLoading } =
    useGetAllAppointments({
      patientId: authState?.userInfo?.fhirId
    });

  useEffect(() => {
    setSessionsFilter({});
  }, [selectedTab]);

  const parsedAppointmentsData = useMemo(() => {
    if (!upcomingData || upcomingData?.total === 0) return null;

    const parsed = parseMergedAppointments(upcomingData);
    return parsed;
  }, [upcomingData]);

  const unfilteredAppointmentsData = useMemo(() => {
    if (!parsedAppointmentsData || parsedAppointmentsData.length === 0)
      return null;

    const filtered = parsedAppointmentsData.filter(session => {
      const slotStart = parseISO(session.slotStart);
      return isAfter(slotStart, now);
    });

    return filtered;
  }, [parsedAppointmentsData]);

  const filteredAppointmentsData = useMemo(() => {
    if (!parsedAppointmentsData || parsedAppointmentsData.length === 0)
      return null;

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

    return parsedAppointmentsData.filter(session => {
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

      // filter by practitioner's name and qualification
      const fullName = mergeNames(
        session.practitionerName,
        session.practitionerQualification
      );

      if (keyword && !fullName?.toLowerCase().includes(keyword.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [parsedAppointmentsData, sessionsFilter, selectedTab, keyword]);

  const listUpcomingSessions = useMemo(() => {
    if (!filteredAppointmentsData || filteredAppointmentsData.length === 0)
      return [];

    return filteredAppointmentsData
      .filter(s => s.slotStart && new Date(s.slotStart) >= now)
      .sort(
        (a, b) =>
          new Date(a.slotStart!).getTime() - new Date(b.slotStart!).getTime() // soonest first
      );
  }, [filteredAppointmentsData]);

  const listPastSessions = useMemo(() => {
    if (!filteredAppointmentsData || filteredAppointmentsData.length === 0)
      return [];

    return filteredAppointmentsData
      .filter(s => s.slotStart && new Date(s.slotStart) < now)
      .sort(
        (a, b) =>
          new Date(b.slotStart!).getTime() - new Date(a.slotStart!).getTime() // most-recent first
      );
  }, [filteredAppointmentsData]);

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
          listUpcomingSessions.map((session: MergedAppointment) => {
            const sessionStartTime = session.slotStart
              ? format(parseISO(session.slotStart), 'HH:mm')
              : '-:-';
            const sessionDate = session.slotStart
              ? format(parseISO(session.slotStart), 'dd/MM/yyyy')
              : '-/-/-';
            const displayName = mergeNames(
              session.practitionerName,
              session.practitionerQualification
            );
            const { initials, backgroundColor } = generateAvatarPlaceholder({
              id: session.practitionerId,
              name: displayName,
              email: session.practitionerEmail
            });
            const photoUrl = session.practitionerPhoto?.[0]?.url;

            return (
              <Link
                key={session.appointmentId}
                href={`/schedule/${session.appointmentId}`}
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
                  <div className='mr-auto text-[12px] font-bold'>
                    {displayName}
                  </div>
                  <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
                    {capitalizeFirstLetter(session.appointmentType)} Session
                  </div>
                </div>
              </Link>
            );
          })
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
          listPastSessions.map((session: MergedAppointment) => {
            const sessionStartTime = session.slotStart
              ? format(parseISO(session.slotStart), 'HH:mm')
              : '-:-';
            const sessionDate = session.slotStart
              ? format(parseISO(session.slotStart), 'dd/MM/yyyy')
              : '-/-/-';
            const displayName = mergeNames(
              session.practitionerName,
              session.practitionerQualification
            );
            const { initials, backgroundColor } = generateAvatarPlaceholder({
              id: session.practitionerId,
              name: displayName,
              email: session.practitionerEmail
            });

            const photoUrl = session.practitionerPhoto?.[0]?.url;

            return (
              <Link
                key={session.appointmentId}
                href={`/schedule/${session.appointmentId}`}
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

                  <div className='mr-auto text-[12px] font-bold'>
                    {displayName}
                  </div>
                  <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
                    {session.appointmentType} session
                  </div>
                </div>
              </Link>
            );
          })
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
            unfilteredAppointmentsData &&
            unfilteredAppointmentsData.length > 0 && (
              <UpcomingSession
                data={unfilteredAppointmentsData}
                role={authState.userInfo.role_name}
              />
            )}
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        <div className='w-full p-4'>
          <div className='mb-4 flex gap-4'>
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
            />
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
            {isUpcomingLoading ? (
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
