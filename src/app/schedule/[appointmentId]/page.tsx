'use client';

import Avatar from '@/components/general/avatar';
import BackButton from '@/components/general/back-button';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';
import { useGetAllAppointments } from '@/services/api/appointments';
import { MergedAppointment } from '@/types/appointment';
import {
  generateAvatarPlaceholder,
  mergeNames,
  parseMergedAppointments
} from '@/utils/helper';
import { capitalizeFirstLetter } from '@/utils/validation';
import { format } from 'date-fns';
import { HospitalIcon } from 'lucide-react';
import { useMemo } from 'react';

type Props = {
  params: { appointmentId: string };
};

export default function DetailAppointment({ params }: Props) {
  const { state: authState } = useAuth();
  const {
    data: upcomingData,
    isLoading: isUpcomingLoading,
    isError: isUpcomingError
  } = useGetAllAppointments({
    patientId: authState?.userInfo?.fhirId
  });

  const appointmentData = useMemo(() => {
    if (!upcomingData || upcomingData?.total === 0) return null;

    const parsed = parseMergedAppointments(upcomingData);

    const found = parsed.find(
      (item: MergedAppointment) => item.appointmentId === params.appointmentId
    );

    return found;
  }, [upcomingData, params.appointmentId]);

  const { initials, backgroundColor, displayName, time, date } = useMemo(() => {
    if (!appointmentData) {
      return {
        displayName: '',
        initials: '',
        backgroundColor: '',
        time: '',
        date: ''
      };
    }

    const name = mergeNames(
      appointmentData.practitionerName,
      appointmentData.practitionerQualification
    );

    const avatar = generateAvatarPlaceholder({
      id: appointmentData.practitionerId,
      name,
      email: appointmentData.practitionerEmail
    });

    const time = format(new Date(appointmentData.slotStart), 'HH:mm');
    const date = format(new Date(appointmentData.slotStart), 'dd/MM/yyy');

    return {
      displayName: name,
      initials: avatar.initials,
      backgroundColor: avatar.backgroundColor,
      time,
      date
    };
  }, [appointmentData]);

  const photoUrl = appointmentData?.practitionerPhoto?.[0]?.url;

  return (
    <>
      <Header>
        <div className='flex w-full items-center'>
          <BackButton />
          <div className='text-[14px] font-bold text-white'>Schedule</div>
        </div>
      </Header>

      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        {!appointmentData || isUpcomingError ? (
          <EmptyState
            className='py-16'
            title='Appointment Not Found'
            subtitle='Please return to the appointment page and select an appointment.'
          />
        ) : isUpcomingLoading ? (
          <div className='flex min-h-screen min-w-full items-center justify-center'>
            <LoadingSpinnerIcon
              width={56}
              height={56}
              className='w-full animate-spin'
            />
          </div>
        ) : (
          <>
            <div className='flex flex-col items-center'>
              <div className='flex flex-col items-center'>
                <Avatar
                  initials={initials}
                  backgroundColor={backgroundColor}
                  photoUrl={photoUrl}
                  className='text-2xl'
                />
              </div>
              <h3 className='mt-2 text-center text-[20px] font-bold'>
                {displayName}
              </h3>
            </div>

            <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9] p-4'>
              <div className='flex items-center'>
                <HospitalIcon size={24} color='#13C2C2' className='mr-2' />
                <span className='text-[12px] font-bold'>Detail Session</span>
              </div>
              <div className='mt-4 flex flex-col space-y-2'>
                <div className='flex justify-between text-[12px]'>
                  <span className='mr-2'>Time</span>
                  <span className='font-bold'>{time}</span>
                </div>
                <div className='flex justify-between text-[12px]'>
                  <span className='mr-2'>Date</span>
                  <span className='font-bold'>{date}</span>
                </div>
                <div className='flex justify-between text-[12px]'>
                  <span className='mr-2'>Session Type</span>
                  <span className='font-bold'>
                    {capitalizeFirstLetter(appointmentData.appointmentType)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
