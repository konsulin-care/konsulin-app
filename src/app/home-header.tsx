'use client';

import Avatar from '@/components/general/avatar';
import Header from '@/components/header';
import UpcomingSession from '@/components/schedule/upcoming-session';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { useGetUpcomingAppointments } from '@/services/api/appointments';
import {
  generateAvatarPlaceholder,
  parseMergedAppointments
} from '@/utils/helper';
import { format, isAfter, parseISO } from 'date-fns';
import { useMemo } from 'react';

const now = new Date();

export default function HomeHeader() {
  const { state: authState, isLoading: isLoadingAuth } = useAuth();
  const { data: upcomingData } = useGetUpcomingAppointments({
    patientId: authState?.userInfo?.fhirId,
    dateReference: format(now, 'yyyy-MM-dd')
  });

  const parsedAppointmentsData = useMemo(() => {
    if (
      !upcomingData ||
      upcomingData?.total === 0 ||
      !authState.isAuthenticated
    )
      return null;

    const parsed = parseMergedAppointments(upcomingData);
    const filtered = parsed.filter(session => {
      const slotStart = parseISO(session.slotStart);
      return isAfter(slotStart, now);
    });

    return filtered;
  }, [upcomingData, authState]);

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
                  Selamat Datang di Dashboard anda
                </div>
                <div className='text-[14px] font-bold text-white'>
                  {displayName}
                </div>
              </div>
            </div>
          )}

          {parsedAppointmentsData && parsedAppointmentsData.length > 0 && (
            <UpcomingSession upcomingData={parsedAppointmentsData} />
          )}
        </div>
      </Header>
    </>
  );
}
