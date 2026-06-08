'use client';

import Avatar from '@/components/general/avatar';
import PageHeader from '@/components/page-header';
import { useScheduleFilter } from '@/components/shared/hooks/useScheduleFilter';
import SchedulePageShell from '@/components/shared/schedule-page-shell';
import { useAuth } from '@/context/auth/authContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useGetAllAppointments } from '@/services/api/appointments';
import { IUseClinicParams } from '@/services/clinic';
import { MergedAppointment } from '@/types/appointment';
import {
  generateAvatarPlaceholder,
  mergeNames,
  parseMergedAppointments
} from '@/utils/helper';
import { capitalizeFirstLetter } from '@/utils/validation';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type Props = {
  readonly fhirId: string;
};

/** Card displaying a single appointment entry. */
const AppointmentCard = ({
  appointment
}: {
  appointment: MergedAppointment;
}) => {
  const appointmentStartTime = appointment.slotStart
    ? format(parseISO(appointment.slotStart), 'HH:mm')
    : '-:-';
  const appointmentDate = appointment.slotStart
    ? format(parseISO(appointment.slotStart), 'dd/MM/yyyy')
    : '-/-/-';
  const fullName = mergeNames(
    appointment.practitionerName,
    appointment.practitionerQualification
  );
  const displayName =
    fullName.trim() === '-' ? appointment.practitionerEmail : fullName;
  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id: appointment.practitionerId,
    name: displayName,
    email: appointment.practitionerEmail
  });
  const photoUrl = appointment.practitionerPhoto?.[0]?.url;

  return (
    <Link
      href={`/schedule?appointmentId=${appointment.appointmentId}`}
      className='card mt-4 flex flex-col gap-2 p-4'
    >
      <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
        {appointmentStartTime} - {appointmentDate}
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
          {capitalizeFirstLetter(appointment.appointmentType)} Session
        </div>
      </div>
    </Link>
  );
};

/**
 *
 */
export default function PatientSchedule({ fhirId }: Props) {
  const { state: authState } = useAuth();
  const [keyword, setKeyword] = useState<string>('');
  const [sessionsFilter, setSessionsFilter] = useState<IUseClinicParams>({});
  const [selectedTab, setSelectedTab] = useState('upcoming');

  const { data: upcomingData, isLoading: isUpcomingLoading } =
    useGetAllAppointments({
      patientId: fhirId
    });

  const debouncedKeyword = useDebounce(keyword, 500);

  const parsedAppointmentsData = useMemo(() => {
    if (
      !upcomingData ||
      upcomingData?.total === 0 ||
      !authState.isAuthenticated
    )
      return null;

    const parsed = parseMergedAppointments(upcomingData);
    return parsed;
  }, [upcomingData, authState]);

  const { upcoming, past } = useScheduleFilter({
    data: parsedAppointmentsData,
    sessionsFilter,
    keyword: debouncedKeyword,
    keywordMatcher: (appointment: MergedAppointment, query: string) => {
      const fullName = mergeNames(
        appointment.practitionerName,
        appointment.practitionerQualification
      )?.toLowerCase();
      const email = appointment.practitionerEmail?.toLowerCase();
      return (
        fullName?.includes(query.toLowerCase()) ||
        email?.includes(query.toLowerCase())
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
        isLoading={isUpcomingLoading}
        upcoming={upcoming}
        past={past}
        renderCard={(appointment: MergedAppointment) => (
          <AppointmentCard appointment={appointment} />
        )}
      />
    </>
  );
}
