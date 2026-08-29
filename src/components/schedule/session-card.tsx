'use client';

import Avatar from '@/components/general/avatar';
import type { MergedSession } from '@/types/appointment';
import { generateAvatarPlaceholder, mergeNames } from '@/utils/helper';
import { capitalizeFirstLetter } from '@/utils/validation';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';

type Props = {
  readonly session: MergedSession;
  readonly locationColor?: string;
  readonly locationName?: string;
};

/** Card displaying a single session entry with optional location color indicator. */
export default function SessionCard({
  session,
  locationColor,
  locationName
}: Readonly<Props>) {
  const sessionStartTime = session.slotStart
    ? format(parseISO(session.slotStart), 'HH:mm')
    : '-:-';
  const sessionDate = session.slotStart
    ? format(parseISO(session.slotStart), 'dd/MM/yyyy')
    : '-/-/-';
  const fullName = mergeNames(session.patientName);
  const displayName = fullName.trim() === '-' ? session.patientEmail : fullName;
  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id: session.patientId,
    name: displayName,
    email: session.patientEmail
  });
  const photoUrl = session.patientPhoto?.[0]?.url;
  const isProcessing =
    session.appointmentStatus === 'proposed' ||
    session.appointmentStatus === 'pending';
  const borderStyle = locationColor
    ? { borderLeftColor: locationColor, borderLeftWidth: 4 }
    : undefined;

  return (
    <Link
      href={`/record?patientId=${session.patientId}`}
      className='card mt-4 flex flex-col gap-2 border-l-4 p-4'
      style={borderStyle}
    >
      <div className='flex items-center justify-between'>
        <div className='text-[10px] text-[hsla(220,9%,19%,0.8)]'>
          {sessionStartTime} - {sessionDate}
        </div>
        <div className='flex items-center gap-2'>
          {isProcessing && (
            <span className='rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-medium text-black'>
              Processing
            </span>
          )}
          {locationName && (
            <div className='text-[10px] text-[hsla(220,9%,19%,0.5)]'>
              {locationName}
            </div>
          )}
        </div>
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
          {session.appointmentType
            ? `${capitalizeFirstLetter(session.appointmentType)} Session`
            : 'Session'}
        </div>
      </div>
    </Link>
  );
}
