/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import Avatar from '@/components/general/avatar';
import { Roles } from '@/constants/roles';
import { MergedAppointment, MergedSession } from '@/types/appointment';
import { generateAvatarPlaceholder, mergeNames } from '@/utils/helper';
import { capitalizeFirstLetter } from '@/utils/validation';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

type Props = {
  data: MergedAppointment[] | MergedSession[];
  role: string;
};

/** Returns the other party's display name, falling back to their email. */
function getDisplayName(
  session: MergedAppointment | MergedSession,
  isPatient: boolean
): string {
  const appointment = session as MergedAppointment;
  const mergedSession = session as MergedSession;
  const fullName = isPatient
    ? mergeNames(
        appointment.practitionerName,
        appointment.practitionerQualification ?? undefined
      )
    : mergeNames(mergedSession.patientName);
  const email = isPatient
    ? appointment.practitionerEmail
    : mergedSession.patientEmail;
  return fullName.trim() === '-' ? email : fullName;
}

/** Returns the avatar photo URL for the current role, when one exists. */
function getAvatarPhoto(
  session: MergedAppointment | MergedSession,
  isPatient: boolean
): string | undefined {
  return isPatient
    ? (session as MergedAppointment).practitionerPhoto?.[0]?.url
    : (session as MergedSession).patientPhoto?.[0]?.url;
}

/** Formats slot bounds as HH:mm–HH:mm, or the start time alone without an end. */
function getTimeRange(
  slotStart: string | null | undefined,
  slotEnd: string | null | undefined
): string {
  const start = slotStart ? format(parseISO(slotStart), 'HH:mm') : '-:-';
  const end = slotEnd ? format(parseISO(slotEnd), 'HH:mm') : null;
  return end ? `${start}–${end}` : start;
}

/** Renders a single compact upcoming session card with photo and time range. */
function SessionCard({
  session,
  role
}: Readonly<{
  session: MergedAppointment | MergedSession;
  role: string;
}>) {
  const isPatient = role === Roles.Patient;
  const appointment = session as MergedAppointment;
  const mergedSession = session as MergedSession;

  const displayName = getDisplayName(session, isPatient);
  const timeRange = getTimeRange(session.slotStart, session.slotEnd);
  const sessionDate = session.slotStart
    ? format(parseISO(session.slotStart), 'EEE, dd MMM')
    : '-/-/-';
  const placeholder = generateAvatarPlaceholder({
    id: isPatient
      ? (appointment.practitionerId ?? undefined)
      : mergedSession.patientId,
    name: displayName ?? undefined,
    email: isPatient
      ? (appointment.practitionerEmail ?? undefined)
      : mergedSession.patientEmail
  });
  const href = isPatient
    ? `/schedule?id=${session.appointmentId}`
    : `/record?patientId=${mergedSession.patientId}`;

  return (
    <Link
      href={href}
      data-testid='upcoming-session-card'
      className='card flex items-center gap-2.5 border-0 bg-[#F9F9F9] p-3'
    >
      <Avatar
        seed={placeholder.seed}
        initials={placeholder.initials ?? ''}
        backgroundColor={placeholder.backgroundColor ?? ''}
        photoUrl={getAvatarPhoto(session, isPatient)}
        className='text-xs'
        imageClassName='self-center'
        height={40}
        width={40}
      />
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className='text-secondary truncate text-left text-[14px] font-bold'>
          {displayName}
        </span>
        {session.appointmentType && (
          <span className='text-muted truncate text-left text-[12px]'>
            {capitalizeFirstLetter(session.appointmentType)} Session
          </span>
        )}
      </div>
      <div className='flex shrink-0 flex-col items-end text-black'>
        <span className='text-[11px] font-bold'>{sessionDate}</span>
        <span className='text-[11px]'>{timeRange}</span>
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
