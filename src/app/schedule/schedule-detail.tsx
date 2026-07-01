/* reason: session detail renders conditional sub-sections for avatar, status, and action buttons */
'use client';

import Avatar from '@/components/general/avatar';
import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { useAppointment } from '@/services/hooks/useAppointment';
import { generateAvatarPlaceholder, mergeNames } from '@/utils/helper';
import { capitalizeFirstLetter } from '@/utils/validation';
import { format } from 'date-fns';
import { HospitalIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

/** Avatar and name section for the appointment session. */
function SessionAvatarSection({
  seed,
  initials,
  backgroundColor,
  photoUrl,
  displayName
}: Readonly<{
  seed: string;
  initials: string;
  backgroundColor: string;
  photoUrl?: string;
  displayName: string;
}>) {
  return (
    <div className='flex flex-col items-center'>
      <div className='flex flex-col items-center'>
        <Avatar
          seed={seed}
          initials={initials}
          backgroundColor={backgroundColor}
          photoUrl={photoUrl}
          className='text-2xl'
        />
      </div>
      <h3 className='mt-2 text-center text-[20px] font-bold'>{displayName}</h3>
    </div>
  );
}

/** Session detail card with time, date, and appointment type. */
function SessionDetailInfo({
  time,
  date,
  appointmentType
}: Readonly<{ time: string; date: string; appointmentType: string }>) {
  return (
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
            {capitalizeFirstLetter(appointmentType)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 *
 */
export default function ScheduleDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';

  const {
    data: appointmentData,
    isLoading,
    isError
  } = useAppointment(id);

  const { initials, backgroundColor, displayName, time, date, seed } =
    useMemo(() => {
      if (!appointmentData) {
        return {
          displayName: '',
          initials: '',
          backgroundColor: '',
          time: '',
          date: '',
          seed: ''
        };
      }

      const name = mergeNames(
        appointmentData.practitionerName ?? [],
        appointmentData.practitionerQualification ?? undefined
      );

      const avatar = generateAvatarPlaceholder({
        id: appointmentData.practitionerId ?? undefined,
        name,
        email: appointmentData.practitionerEmail ?? undefined
      });

      const time = format(new Date(appointmentData.slotStart ?? ''), 'HH:mm');
      const date = format(
        new Date(appointmentData.slotStart ?? ''),
        'dd/MM/yyy'
      );

      return {
        displayName: name,
        initials: avatar.initials ?? '',
        backgroundColor: avatar.backgroundColor ?? '',
        seed: avatar.seed,
        time,
        date
      };
    }, [appointmentData]);

  const photoUrl = appointmentData?.practitionerPhoto?.[0]?.url;

  /** Renders appointment detail or empty/loading states. */
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className='flex min-h-screen min-w-full items-center justify-center'>
          <LoadingSpinnerIcon
            width={56}
            height={56}
            className='w-full animate-spin'
          />
        </div>
      );
    }
    if (!appointmentData || isError) {
      return (
        <EmptyState
          className='py-16'
          title='Appointment Not Found'
          subtitle='Please return to the appointment page and select an appointment.'
        />
      );
    }
    return (
      <>
        <SessionAvatarSection
          seed={seed}
          initials={initials}
          backgroundColor={backgroundColor}
          photoUrl={photoUrl}
          displayName={displayName}
        />

        <SessionDetailInfo
          time={time}
          date={date}
          appointmentType={appointmentData.appointmentType}
        />
      </>
    );
  };

  return (
    <>
      <PageHeader />

      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        {renderContent()}
      </div>
    </>
  );
}
