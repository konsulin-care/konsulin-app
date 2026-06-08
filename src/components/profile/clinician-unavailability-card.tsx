'use client';

import MarkUnavailabilityButton from '@/components/schedule/mark-unavailability';
import Image from 'next/image';

/**
 *
 */
export default function ClinicianUnavailabilityCard() {
  return (
    <div className='mt-4 flex w-full flex-col items-center justify-center rounded-[16px] border-0 bg-[#F9F9F9] p-4'>
      <div className='flex w-full items-center justify-between'>
        <div className='flex w-1/2 items-center'>
          <Image
            src={'/icons/calendar-profile.svg'}
            width={30}
            height={30}
            alt='calendar-icon'
            className='pr-[13px]'
          />
          <p className='flex-grow text-start text-[10px] font-normal text-[#2C2F35] opacity-40'>
            Current Unavailability
          </p>
        </div>
        <div className='flex w-1/2 items-center justify-end'>
          <MarkUnavailabilityButton
            triggerClassName='cursor-pointer hover:brightness-90 transition-all duration-200'
            buttonText='Mark Away'
          />
        </div>
      </div>

      <div className='mt-2 flex w-full flex-col border-t border-[#E3E3E3]'>
        <div className='py-2 text-center text-[14px] text-[#2C2F35]'>
          No Unavailability
        </div>
      </div>
    </div>
  );
}
