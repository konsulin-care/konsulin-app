'use client';

import BackButton from '@/components/general/back-button';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import NavigationBar from '@/components/navigation-bar';
import UpcomingSession from '@/components/schedule/upcoming-session';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth/authContext';
import { useGetAllAppointments } from '@/services/api/appointments';
import { IUseClinicParams } from '@/services/clinic';
import {
  MergedAppointment,
  mergeNames,
  parseMergedAppointments
} from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import ClinicFilter from '../clinic/clinic-filter';

const now = new Date();

export default function Schedule() {
  const [keyword, setKeyword] = useState<string>('');
  const [clinicFilter, setClinicFilter] = useState<IUseClinicParams>({});

  const { state: authState } = useAuth();
  const { data: upcomingData } = useGetAllAppointments({
    patientId: authState?.userInfo?.fhirId
  });

  const parsedAppointmentsData = useMemo(() => {
    if (!upcomingData || upcomingData?.total === 0) return null;

    const parsed = parseMergedAppointments(upcomingData);
    return parsed;
  }, [upcomingData]);

  const listUpcomingSessions = useMemo(() => {
    if (!parsedAppointmentsData || parsedAppointmentsData.length === 0)
      return [];

    return parsedAppointmentsData
      .filter(s => s.slotStart && new Date(s.slotStart) >= now)
      .sort(
        (a, b) =>
          new Date(a.slotStart!).getTime() - new Date(b.slotStart!).getTime() // soonest first
      );
  }, [parsedAppointmentsData]);

  const listPastSessions = useMemo(() => {
    if (!parsedAppointmentsData || parsedAppointmentsData.length === 0)
      return [];

    return parsedAppointmentsData
      .filter(s => s.slotStart && new Date(s.slotStart) < now)
      .sort(
        (a, b) =>
          new Date(b.slotStart!).getTime() - new Date(a.slotStart!).getTime() // most-recent first
      );
  }, [parsedAppointmentsData]);

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
                  <Image
                    className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
                    width={32}
                    height={32}
                    alt='offline'
                    src={
                      session.practitionerPhoto
                        ? session.practitionerPhoto[0].url
                        : '/images/avatar.jpg'
                    }
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
                  <Image
                    className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
                    width={32}
                    height={32}
                    alt='offline'
                    src={
                      session.practitionerPhoto
                        ? session.practitionerPhoto[0].url
                        : '/images/avatar.jpg'
                    }
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

          {parsedAppointmentsData && parsedAppointmentsData.length > 0 && (
            <UpcomingSession upcomingData={parsedAppointmentsData} />
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
            <ClinicFilter
              onChange={(filter: IUseClinicParams) => {
                setClinicFilter(prevState => ({
                  ...prevState,
                  ...filter
                }));
              }}
              type='clinician'
            />
          </div>

          <Tabs defaultValue='upcoming' className='w-full'>
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
            <TabsContent value='upcoming'>
              <TabUpcomingSession />
            </TabsContent>
            <TabsContent value='past'>
              <TabPastSession />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
