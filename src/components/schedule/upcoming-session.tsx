import { mergeNames } from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';

export default function UpcomingSession({ upcomingData }) {
  const nextSession = upcomingData[0];
  const sessionStartTime = nextSession.slotStart
    ? format(parseISO(nextSession.slotStart), 'HH:mm')
    : '-:-';
  const sessionDate = nextSession.slotStart
    ? format(parseISO(nextSession.slotStart), 'dd/MM/yyyy')
    : '-/-/-';

  return (
    <>
      <div className='card mt-4 flex items-center bg-[#F9F9F9]'>
        <Image
          className='mr-[10px] min-h-[32] min-w-[32]'
          src={'/icons/calendar.svg'}
          width={32}
          height={32}
          alt='calendar'
        />
        <div className='mr-auto flex flex-col'>
          <span className='text-[12px] text-muted'>Upcoming Session With</span>
          <span className='text-left text-[14px] font-bold text-secondary'>
            {mergeNames(nextSession.practitionerName)}
          </span>
        </div>
        <div className='s'>
          <span className='text-[12px] font-bold'>{sessionStartTime} </span>
          <span className='text-[12px]'>| {sessionDate}</span>
        </div>
      </div>
    </>
  );
}
