'use client';

import { cn } from '@/lib/utils';
import { DayOfWeek, DaySelectorNavigationProps } from '@/types/availability';
import { getDayShortName, hasAvailabilityForDay } from '@/utils/availability';

/**
 *
 */
export default function DaySelectorNavigation({
  selectedDay,
  weeklyAvailability,
  onSelectDay
}: DaySelectorNavigationProps) {
  const days: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className='flex w-full justify-center gap-2 pb-6 sm:gap-3'>
      {days.map(day => {
        const hasAvailability = hasAvailabilityForDay(day, weeklyAvailability);
        const isSelected = day === selectedDay;

        return (
          <button
            key={day}
            onClick={() => onSelectDay(day)}
            className='flex flex-col items-center gap-[2px]'
            aria-label={`Select ${getDayShortName(day)}`}
            aria-pressed={isSelected}
          >
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors sm:h-12 sm:w-12',
                hasAvailability
                  ? 'bg-secondary text-white'
                  : 'bg-[#F9F9F9] text-black'
              )}
            >
              {getDayShortName(day)}
            </div>
            {isSelected && (
              <div className='bg-secondary h-1.5 w-1.5 rounded-full' />
            )}
          </button>
        );
      })}
    </div>
  );
}
