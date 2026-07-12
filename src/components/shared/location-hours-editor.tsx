'use client';

import TimeRangeInput from '@/components/availability/time-range-input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DayOfWeek, TimeRange } from '@/types/availability';
import {
  getDayName,
  getDayShortName,
  validateTimeRange
} from '@/utils/availability';
import { Plus } from 'lucide-react';
import { useState } from 'react';

/** Type-safe getter to avoid Codacy Object Injection Sink on dynamic key access. */
function getHoursForDay(
  hours: Record<DayOfWeek, TimeRange[]>,
  day: DayOfWeek
): TimeRange[] {
  return hours[day];
}

type LocationHoursEditorProps = {
  readonly hours: Record<DayOfWeek, TimeRange[]>;
  readonly onAddTimeRange: (day: DayOfWeek) => void;
  readonly onUpdateTimeRange: (
    day: DayOfWeek,
    id: string,
    field: 'from' | 'to',
    value: string
  ) => void;
  readonly onDeleteTimeRange: (day: DayOfWeek, id: string) => void;
};

const DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * Day/time editor for Location.hoursOfOperation.
 *
 * Shows a row of 7 day-selector buttons (Mon–Sun) and time range inputs
 * for the currently selected day. Reuses TimeRangeInput from the
 * availability module for individual time-slot editing.
 */
export default function LocationHoursEditor({
  hours,
  onAddTimeRange,
  onUpdateTimeRange,
  onDeleteTimeRange
}: LocationHoursEditorProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(0);
  const dayHours = getHoursForDay(hours, selectedDay);

  return (
    <div className='space-y-4'>
      {/* Day selector */}
      <div className='flex w-full justify-center gap-2'>
        {DAYS.map(day => {
          const isSelected = day === selectedDay;
          const hasHours = getHoursForDay(hours, day).length > 0;

          return (
            <button
              key={day}
              type='button'
              onClick={() => {
                setSelectedDay(day);
              }}
              className='flex flex-col items-center gap-[2px]'
              aria-label={`Select ${getDayShortName(day)}`}
              aria-pressed={isSelected}
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors sm:h-12 sm:w-12',
                  hasHours
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

      {/* Day header */}
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-semibold text-gray-900'>
          {getDayName(selectedDay)} Hours
        </h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => onAddTimeRange(selectedDay)}
          className='h-7 gap-1 text-xs'
        >
          <Plus className='h-3 w-3' />
          Add Time
        </Button>
      </div>

      {/* Time ranges */}
      <div className='space-y-3'>
        {dayHours.length === 0 ? (
          <p className='py-4 text-center text-xs text-gray-500'>
            No hours set for this day
          </p>
        ) : (
          dayHours.map(timeRange => {
            const validation = validateTimeRange(timeRange);
            return (
              <TimeRangeInput
                key={timeRange.id}
                timeRange={timeRange}
                onFromChange={value => {
                  onUpdateTimeRange(selectedDay, timeRange.id, 'from', value);
                }}
                onToChange={value => {
                  onUpdateTimeRange(selectedDay, timeRange.id, 'to', value);
                }}
                onRemove={() => {
                  onDeleteTimeRange(selectedDay, timeRange.id);
                }}
                showRemoveButton
                error={validation.valid ? undefined : validation.error}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
