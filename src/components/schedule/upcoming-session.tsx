/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Roles } from '@/constants/roles';
import { MergedAppointment, MergedSession } from '@/types/appointment';
import { mergeNames } from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import { Calendar } from 'lucide-react';
import Link from 'next/link';

type Props = {
  data: MergedAppointment[] | MergedSession[];
  role: string;
};

/** Renders a single upcoming session card with time and participant info. */
function SessionCard({
  session,
  role
}: Readonly<{
  session: MergedAppointment | MergedSession;
  role: string;
}>) {
  const sessionStartTime = session.slotStart
    ? format(parseISO(session.slotStart), 'HH:mm')
    : '-:-';
  const sessionDate = session.slotStart
    ? format(parseISO(session.slotStart), 'dd/MM/yyyy')
    : '-/-/-';

  const isPatient = role === Roles.Patient;

  const displayName = (() => {
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
  const href = isPatient
    ? `/schedule?id=${session.appointmentId}`
    : `/record?patientId=${(session as MergedSession).patientId}`;

  return (
    <Link
      href={href}
      className='card flex h-full flex-col gap-1.5 border-0 bg-[#F9F9F9] p-3'
    >
      <div className='flex items-center'>
        <Calendar className='mr-[10px] h-5 w-5 shrink-0 text-black' />
        <span className='text-muted text-[12px]'>Upcoming Session With</span>
      </div>
      <span className='text-secondary truncate text-left text-[14px] font-bold'>
        {displayName}
      </span>
      <div className='flex items-center justify-between text-[11px] text-gray-600'>
        <span className='font-bold text-black'>{sessionStartTime}</span>
        <span>{sessionDate}</span>
      </div>
    </Link>
  );
}

/**
 *
 */
export default function UpcomingSession({ data, role }: Readonly<Props>) {
  if (!data || data.length === 0) return null;

  return (
    <>
      {data.map(session => (
        <SessionCard
          key={session.appointmentId}
          session={session}
          role={role}
        />
      ))}
    </>
  );
}
