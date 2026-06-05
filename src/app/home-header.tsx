'use client';

import Avatar from '@/components/general/avatar';
import Header from '@/components/header';
import UpcomingSession from '@/components/schedule/upcoming-session';
import { Skeleton } from '@/components/ui/skeleton';
import { getNow } from '@/constants/date';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useUpcomingEvents } from '@/hooks/useUpcomingEvents';
import {
  generateAvatarPlaceholder,
  parseMergedAppointments,
  parseMergedSessions
} from '@/utils/helper';
import { isAfter, parseISO } from 'date-fns';
import { useMemo } from 'react';

export default function HomeHeader() {
  const { state: authState, isLoading: isLoadingAuth } = useAuth();
  const { appointmentData, sessionData } = useUpcomingEvents();

  const role = authState?.userInfo?.role_name;
  const isPatient = role === Roles.Patient;
  const isAdmin = role === Roles.ClinicAdmin;

  const parsedAppointmentsData = useMemo(() => {
    if (
      !appointmentData ||
      appointmentData?.total === 0 ||
      !authState.isAuthenticated
    )
      return null;

    const parsed = parseMergedAppointments(appointmentData);
    const filtered = parsed.filter(session => {
      const slotStart = parseISO(session.slotStart);
      return isAfter(slotStart, getNow());
    });

    return filtered;
  }, [appointmentData, authState]);

  const parsedSessionsData = useMemo(() => {
    if (!sessionData || sessionData?.total === 0 || !authState.isAuthenticated)
      return null;

    const parsed = parseMergedSessions(sessionData);
    const filtered = parsed.filter(session => {
      const slotStart = parseISO(session.slotStart);
      return isAfter(slotStart, getNow());
    });

    return filtered;
  }, [sessionData, authState]);

  const allData = isPatient ? parsedAppointmentsData : parsedSessionsData;
  const data = allData?.slice(0, 1) ?? null;

  const { initials, backgroundColor } = generateAvatarPlaceholder({
    id: authState.userInfo?.fhirId,
    name: authState.userInfo?.fullname,
    email: authState.userInfo?.email
  });

  const displayName =
    !authState.userInfo.fullname || authState.userInfo.fullname.trim() === '-'
      ? authState.userInfo.email
      : authState.userInfo.fullname;

  return (
    <>
      <Header>
        <div className='flex w-full flex-col justify-center'>
          {isLoadingAuth ? (
            <div className='flex items-center space-x-4'>
              <Skeleton className='h-[32px] w-[32px] rounded-full' />
              <div className='space-y-2'>
                <Skeleton className='h-[10px] w-[250px]' />
                <Skeleton className='h-[14px] w-[200px]' />
              </div>
            </div>
          ) : !authState.isAuthenticated ? (
            <div className='flex flex-col'>
              <div className='flex h-[32px] items-center text-[14px] font-bold text-white'>
                Konsulin
              </div>
            </div>
          ) : (
            <div className='flex'>
              <Avatar
                initials={initials}
                backgroundColor={backgroundColor}
                photoUrl={authState.userInfo.profile_picture}
                height={32}
                width={32}
                className='mr-2 text-xs'
                imageClassName='mr-2 self-center'
              />
              <div className='flex h-[32px] flex-col'>
                <div className='text-[10px] font-normal text-white'>
                  Welcome to Your Dashboard
                </div>
                <div className='text-[14px] font-bold text-white'>
                  {displayName}
                </div>
              </div>
            </div>
          )}

          {data && data.length > 0 && !isAdmin && (
            <UpcomingSession data={data} role={role} />
          )}
        </div>
      </Header>
    </>
  );
}
