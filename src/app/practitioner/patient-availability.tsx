'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar-temp';
import { useDetailPractitioner } from '@/services/clinic';
import { computeFreeSlots, usePractitionerSlots } from '@/services/clinicians';
import { isBefore, startOfDay } from 'date-fns';
import { useMemo, useState } from 'react';

type Props = {
  readonly practitionerRoleId: string;
};

/**
 * Patient-facing availability view with calendar and free-slot computation.
 *
 * Past dates are disabled. Only days matching the practitioner's
 * availableTime are enabled. On date selection, busy slots are fetched
 * and free 60-min windows are displayed as selectable pills.
 */
export default function PatientAvailability({
  practitionerRoleId
}: Readonly<Props>) {
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { newData: detail, isLoading } =
    useDetailPractitioner(practitionerRoleId);

  const dateStr = useMemo(
    () => (selectedDate ? selectedDate.toISOString().split('T')[0] : ''),
    [selectedDate]
  );

  const { data: busySlots, isLoading: isSlotsLoading } =
    usePractitionerSlots(practitionerRoleId, dateStr);

  const availableTime = detail?.resource?.availableTime ?? [];

  // Compute free slots whenever data changes
  const freeSlots = useMemo(() => {
    if (!selectedDate || !busySlots) return [];
    return computeFreeSlots(availableTime, busySlots, selectedDate);
  }, [availableTime, busySlots, selectedDate]);

  if (isLoading) {
    return (
      <div className='flex min-h-[40vh] items-center justify-center'>
        <LoadingSpinnerIcon
          width={56}
          height={56}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  const handleDateSelect = (date?: Date) => {
    if (!date) return;
    setSelectedDate(date);
  };

  return (
    <div className='flex flex-col gap-4'>
      {/* Calendar */}
      <div className='flex justify-center'>
        <Calendar
          mode='single'
          selected={selectedDate}
          onSelect={handleDateSelect}
          disabled={date =>
            isBefore(date, today) || !isDateAvailable(date, availableTime)
          }
          defaultMonth={today}
        />
      </div>

      {/* Free slots */}
      {selectedDate && (
        <div>
          <div className='mb-2 text-sm font-bold text-black'>
            Available Times
          </div>
          {isSlotsLoading ? (
            <div className='flex justify-center py-4'>
              <LoadingSpinnerIcon
                width={32}
                height={32}
                className='animate-spin'
              />
            </div>
          ) : freeSlots.length > 0 ? (
            <div className='flex flex-wrap gap-2'>
              {freeSlots.map(slot => (
                <Badge
                  key={`${slot.start}-${slot.end}`}
                  className='cursor-pointer bg-[#13C2C2] px-3 py-2 text-sm text-white hover:bg-[#0EA5A5]'
                >
                  {slot.start} - {slot.end}
                </Badge>
              ))}
            </div>
          ) : (
            <div className='text-sm text-gray-500'>
              No available slots for this date
            </div>
          )}
        </div>
      )}

      {!selectedDate && !isLoading && (
        <div className='text-center text-sm text-gray-500'>
          Select a date to see available times
        </div>
      )}
    </div>
  );
}

/** Check if a date falls on a day the practitioner is available. */
function isDateAvailable(
  date: Date,
  availableTime: Array<{ daysOfWeek?: string[] }>
): boolean {
  const dayLabels = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayLabel = dayLabels[date.getDay()];
  return availableTime.some(a => a.daysOfWeek?.includes(dayLabel));
}
