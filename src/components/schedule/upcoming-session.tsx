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
    ? `/schedule?appointmentId=${session.appointmentId}`
    : `/record?patientId=${(session as MergedSession).patientId}`;

  return (
    <Link
      href={href}
      className='card mt-4 flex items-center border-0 bg-[#F9F9F9]'
    >
      <Calendar className='mr-[10px] h-5 w-5 shrink-0 text-black' />
      <div className='mr-auto flex flex-col'>
        <span className='text-muted text-[12px]'>Upcoming Session With</span>
        <span className='text-secondary text-left text-[14px] font-bold'>
          {displayName}
        </span>
      </div>
      <div>
        <span className='text-[12px] font-bold'>{sessionStartTime} </span>
        <span className='text-[12px]'> | {sessionDate}</span>
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
