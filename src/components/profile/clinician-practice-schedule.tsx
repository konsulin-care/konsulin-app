'use client';
/* eslint-disable react/jsx-max-depth */

import Image from 'next/image';
import Tags from './tags';

type GroupedAvailability = Record<
  string,
  {
    availability: Record<string, Array<{ fromTime: string; toTime: string }>>;
  }
>;

type Props = {
  groupedByFirmAndDay: GroupedAvailability;
  onEditSchedule: () => void;
};

/**
 *
 */
export default function ClinicianPracticeSchedule({
  groupedByFirmAndDay,
  onEditSchedule
}: Props) {
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
            Practice Schedule
          </p>
        </div>
        <div className='flex w-1/2 items-center justify-end'>
          <button
            onClick={onEditSchedule}
            className='cursor-pointer transition-all duration-200 hover:brightness-90'
          >
            <div className='bg-secondary w-[100px] rounded-full p-[7px]'>
              <p className='text-[10px] text-white'>Edit Schedule</p>
            </div>
          </button>
        </div>
      </div>

      <div className='mt-2 flex w-full flex-col border-t border-[#E3E3E3]'>
        {Object.keys(groupedByFirmAndDay).map(firm => {
          const availability = groupedByFirmAndDay[firm].availability;
          return (
            <div key={firm}>
              <div className='mb-1 text-start text-[14px] font-bold'>
                {firm}
              </div>
              {Object.keys(availability).map(day => {
                const timeRanges = availability[day] || [];
                const tags = timeRanges.map(
                  (timeRange: any) =>
                    `${day}: ${timeRange.fromTime} - ${timeRange.toTime}`
                );

                return (
                  <div
                    key={`${firm}-${day}`}
                    className='mb-1 flex w-full flex-wrap gap-[10px]'
                  >
                    <Tags tags={tags} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
