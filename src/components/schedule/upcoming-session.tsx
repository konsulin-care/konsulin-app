import { Roles } from '@/constants/roles';
import { MergedAppointment, MergedSession } from '@/types/appointment';
import { mergeNames } from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';

type Props = {
  data: MergedAppointment[] | MergedSession[];
  role: string;
};

function SessionCard({
  session,
  role
}: {
  session: MergedAppointment | MergedSession;
  role: string;
}) {
  const sessionStartTime = session.slotStart
    ? format(parseISO(session.slotStart), 'HH:mm')
    : '-:-';
  const sessionDate = session.slotStart
    ? format(parseISO(session.slotStart), 'dd/MM/yyyy')
    : '-/-/-';

  const displayName = (() => {
    const isPatient = role === Roles.Patient;
    const fullName = isPatient
      ? mergeNames(
          (session as MergedAppointment).practitionerName,
          (session as MergedAppointment).practitionerQualification
        )
      : mergeNames((session as MergedSession).patientName);
    const email = isPatient
      ? (session as MergedAppointment).practitionerEmail
      : (session as MergedSession).patientEmail;
    return fullName.trim() === '-' ? email : fullName;
  })();

  return (
    <div className='card mt-4 flex items-center border-0 bg-[#F9F9F9]'>
      <Image
        className='mr-[10px] min-h-[32] min-w-[32]'
        src={'/icons/calendar.svg'}
        width={32}
        height={32}
        alt='calendar'
      />
      <div className='mr-auto flex flex-col'>
        <span className='text-muted text-[12px]'>Upcoming Session With</span>
        <span className='text-secondary text-left text-[14px] font-bold'>
          {displayName}
        </span>
      </div>
      <div>
        <span className='text-[12px] font-bold'>{sessionStartTime} </span>
        <span className='text-[12px]'>| {sessionDate}</span>
      </div>
    </div>
  );
}

export default function UpcomingSession({ data, role }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <>
      {data.map((session, index) => (
        <SessionCard key={index} session={session} role={role} />
      ))}
    </>
  );
}
