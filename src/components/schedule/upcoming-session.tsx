import { Roles } from '@/constants/roles';
import { MergedAppointment, MergedSession } from '@/types/appointment';
import { mergeNames } from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  data: MergedAppointment[] | MergedSession[];
  role: string;
};
export default function UpcomingSession({ data, role }: Props) {
  const [nextSession, setNextSession] = useState<
    MergedAppointment | MergedSession
  >(null);
  const sessionStartTime =
    nextSession && nextSession.slotStart
      ? format(parseISO(nextSession.slotStart), 'HH:mm')
      : '-:-';
  const sessionDate =
    nextSession && nextSession.slotStart
      ? format(parseISO(nextSession.slotStart), 'dd/MM/yyyy')
      : '-/-/-';

  useEffect(() => {
    if (!data || data.length === 0) return null;

    setNextSession(data[0]);
  }, [data]);

  const displayName = useMemo(() => {
    if (!nextSession) return null;

    const isPatient = role === Roles.Patient;

    const fullName = isPatient
      ? mergeNames(
          (nextSession as MergedAppointment).practitionerName,
          (nextSession as MergedAppointment).practitionerQualification
        )
      : mergeNames((nextSession as MergedSession).patientName);

    const email = isPatient
      ? (nextSession as MergedAppointment).practitionerEmail
      : (nextSession as MergedSession).patientEmail;

    const result = fullName.trim() === '-' ? email : fullName;

    return result;
  }, [nextSession]);

  return (
    <>
      {data && nextSession && (
        <>
          <div className='card mt-4 flex items-center border-0 bg-[#F9F9F9]'>
            <Image
              className='mr-[10px] min-h-[32] min-w-[32]'
              src={'/icons/calendar.svg'}
              width={32}
              height={32}
              alt='calendar'
            />
            <div className='mr-auto flex flex-col'>
              <span className='text-muted text-[12px]'>
                Upcoming Session With
              </span>
              <span className='text-secondary text-left text-[14px] font-bold'>
                {displayName}
              </span>
            </div>
            <div className='s'>
              <span className='text-[12px] font-bold'>{sessionStartTime} </span>
              <span className='text-[12px]'>| {sessionDate}</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
