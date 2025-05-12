import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger
} from '@/components/ui/drawer';
import { useBooking } from '@/context/booking/bookingContext';
import { cn } from '@/lib/utils';
import { useFindAvailability } from '@/services/clinicians';
import {
  addDays,
  addMinutes,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parse,
  parseISO
} from 'date-fns';
import {
  BundleEntry,
  PractitionerRole,
  PractitionerRoleAvailableTime,
  Slot
} from 'fhir/r4';
import { ReactNode, useEffect, useMemo, useState } from 'react';

/* returns all available appointment days for a given month.
 * example:
 * if availableTime = [{ daysOfWeek: ['mon', 'wed'] }] and month = April 2025,
 * it will return all mondays and wednesdays in April 2025
 */
const getAvailableDays = (availableTime: any[], month: Date): Date[] => {
  const availableDays: Date[] = [];
  const daysOfWeekMap: Record<string, number> = {
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
    sun: 0
  };

  // loop through available times and days of the week
  availableTime.forEach(({ daysOfWeek }) => {
    daysOfWeek.forEach((day: string) => {
      const dayIndex = daysOfWeekMap[day];

      const firstDayOfMonth = new Date(
        month.getFullYear(),
        month.getMonth(),
        1
      );

      // find the first occurrence of the specified day
      let currentDate = new Date(firstDayOfMonth);
      while (currentDate.getDay() !== dayIndex) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // add every occurrence of the specified day in the month (once a week)
      while (currentDate.getMonth() === month.getMonth()) {
        availableDays.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 7); // +7 to move to the next week
      }
    });
  });

  return availableDays;
};

type Props = {
  children: ReactNode;
  practitionerRole: PractitionerRole;
};

export default function PractitionerAvailbility({
  children,
  practitionerRole
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [isOpen, setIsOpen] = useState(false);
  const { state: bookingState, dispatch } = useBooking();

  const { data: schedule, isLoading } = useFindAvailability({
    practitionerRoleId: practitionerRole.id,
    dateReference: bookingState.date
      ? format(bookingState.date, 'yyyy-MM-dd')
      : null
  });

  const listAvailableDate = getAvailableDays(
    practitionerRole.availableTime,
    bookingState.date
  );

  const isDateAvailable = (date: Date, availableDays: Date[]): boolean => {
    return availableDays.some(
      availableDate =>
        date.getFullYear() === availableDate.getFullYear() &&
        date.getMonth() === availableDate.getMonth() &&
        date.getDate() === availableDate.getDate()
    );
  };

  const handleFilterChange = (label: string, value: any) => {
    dispatch({
      type: 'UPDATE_BOOKING_INFO',
      payload: {
        [label]: value
      }
    });
  };

  const getNextAvailableDate = (
    currentDate: Date,
    availableDays: Date[]
  ): Date => {
    let date = new Date(currentDate);

    // loop until an available day is found
    while (!isDateAvailable(date, availableDays)) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  };

  const getTimeSlots = (startTime: string, endTime: string) => {
    const slots: string[] = [];
    let start = parse(startTime, 'HH:mm:ss', new Date());
    const end = parse(endTime, 'HH:mm:ss', new Date());

    while (start <= end) {
      slots.push(format(start, 'HH:mm'));
      start = addMinutes(start, 30);
    }

    return slots;
  };

  const findSchedule = schedule?.find(
    (item: BundleEntry) => item.resource.resourceType === 'Schedule'
  );

  const scheduleId = findSchedule ? findSchedule.resource.id : null;

  const unavailableSlots = useMemo(() => {
    if (!schedule) return [];

    return schedule
      .filter(
        (entry: BundleEntry) =>
          entry.resource.resourceType === 'Slot' &&
          entry.resource.status === 'busy-unavailable'
      )
      .map((slot: BundleEntry<Slot>) => ({
        start: parseISO(slot.resource.start),
        end: parseISO(slot.resource.end)
      }));
  }, [schedule]);

  const availableTimeSlots = useMemo(() => {
    if (!bookingState.date) return [];

    const dayOfWeek = format(bookingState.date, 'eee')
      .toLowerCase()
      .substring(0, 3);

    const availableTimesForDay = practitionerRole.availableTime.filter(
      (time: PractitionerRoleAvailableTime) =>
        time.daysOfWeek.map(day => day.toLowerCase()).includes(dayOfWeek)
    );

    let allSlots: string[] = [];

    // generate available time slots in 30-minute intervals
    availableTimesForDay.forEach((time: PractitionerRoleAvailableTime) => {
      const startTime = time.availableStartTime;
      const endTime = time.availableEndTime;

      allSlots.push(...getTimeSlots(startTime, endTime));
    });

    // Add 30 minutes to the slot start time to get the slot's end time
    return allSlots.map(slotTime => {
      const slotStart = parse(slotTime, 'HH:mm', bookingState.date);
      const slotEnd = addMinutes(slotStart, 30);

      /* Check if the busy slot is on the same day as the selected date
       * and if the available slot overlaps with the busy slot by ensuring the available slot starts before the busy slot ends
       * and ends after the busy slot starts.
       * */
      const isUnavailable = unavailableSlots.some((slot: Slot) => {
        const busyStart = slot.start;
        const busyEnd = slot.end;
        const sameDay = isSameDay(busyStart, bookingState.date);
        const beforeEnd = isBefore(slotStart, busyEnd);
        const afterStart = isAfter(slotEnd, busyStart);

        return sameDay && beforeEnd && afterStart;
      });

      // check if the slot time is in the past
      const now = new Date();
      const isPast = isBefore(slotStart, now);

      return {
        startTime: slotTime,
        isUnavailable: isUnavailable || isPast
      };
    });
  }, [bookingState.date, practitionerRole.availableTime, unavailableSlots]);

  /* set the initial date to the next available date if today’s date is not available. */
  useEffect(() => {
    const initialDate = isDateAvailable(today, listAvailableDate)
      ? today
      : getNextAvailableDate(today, listAvailableDate);

    if (
      bookingState.date.getTime() !== initialDate.getTime() &&
      !bookingState.hasUserChosenDate
    ) {
      handleFilterChange('date', initialDate);
    }
  }, []);

  return (
    <Drawer onClose={() => setIsOpen(false)} open={isOpen}>
      <DrawerTrigger asChild>
        <div onClick={() => setIsOpen(true)}>{children}</div>
      </DrawerTrigger>
      <DrawerContent
        onInteractOutside={() => setIsOpen(false)}
        className='mx-auto max-w-screen-sm p-4'
      >
        <div className='mt-4'>
          <div className='flex flex-col'>
            <DrawerTitle className='mx-auto text-[20px] font-bold'>
              See Availbility
            </DrawerTitle>
            <div className='mt-4 flex w-full flex-col justify-center'>
              <DrawerDescription />
              <Calendar
                defaultMonth={bookingState.date}
                mode='single'
                selected={bookingState.date}
                onSelect={date => {
                  handleFilterChange('date', date);
                  handleFilterChange('scheduleId', null);
                  handleFilterChange('startTime', null);
                  handleFilterChange('hasUserChosenDate', true);
                }}
                onMonthChange={params => {
                  if (params.getMonth() === today.getMonth()) {
                    handleFilterChange('date', addDays(today, 1));
                  } else {
                    handleFilterChange('date', params);
                  }
                }}
                disabled={date =>
                  date < today ||
                  !listAvailableDate.some(
                    availableDate => availableDate.getTime() === date.getTime()
                  ) ||
                  !schedule
                }
                modifiers={{
                  ada: listAvailableDate
                }}
                modifiersClassNames={{ ada: '!text-secondary' }}
                classNames={{
                  month: 'space-y-8 w-full',
                  head_row: 'flex w-full',
                  head_cell:
                    'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] w-full',
                  cell: 'w-full h-9 [&:has([aria-selected].day-outside)]:bg-secondary [&:has([aria-selected].day-outside)]:rounded-md [&:has([aria-selected].day-outside)]:text-accent-foreground  focus-within:z-20',
                  day: cn(
                    buttonVariants({ variant: 'ghost' }),
                    'h-9 p-0 font-normal aria-selected:opacity-100 w-full text-[red]'
                  ),
                  day_selected:
                    'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground !text-white !rounded-md',
                  day_today:
                    'text-accent-foreground font-bold border-b-2 border-secondary rounded-none'
                }}
              />
            </div>

            <div className='card mt-4 border-0 bg-[#F9F9F9]'>
              <div className='mb-4 font-bold'>
                {bookingState.date && format(bookingState.date, 'dd MMMM yyyy')}
              </div>
              {isLoading ? (
                <div className='flex h-[120px] items-center justify-center'>
                  <LoadingSpinnerIcon
                    width={50}
                    height={50}
                    className='w-full animate-spin'
                  />
                </div>
              ) : availableTimeSlots.length === 0 ? (
                <div className='flex w-full justify-center'>
                  <EmptyState
                    size={42}
                    title='No available time slots'
                    subtitle='Try another date'
                  />
                </div>
              ) : (
                <div className='grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] justify-center gap-x-1 gap-y-2'>
                  {availableTimeSlots.map(
                    ({ startTime, isUnavailable }, index) => (
                      <Button
                        variant='outline'
                        key={index}
                        disabled={isUnavailable || !schedule}
                        onClick={() => {
                          handleFilterChange('startTime', startTime);
                          handleFilterChange('scheduleId', scheduleId);
                        }}
                        className={cn(
                          'w-full items-center justify-center rounded-md border-0 px-4 py-2 text-[12px]',
                          startTime === bookingState.startTime
                            ? 'bg-secondary font-bold text-white hover:bg-secondary'
                            : 'bg-white font-normal'
                        )}
                      >
                        {startTime}
                      </Button>
                    )
                  )}
                </div>
              )}
            </div>

            <Button
              className='mt-4 rounded-xl bg-secondary text-white'
              onClick={() => setIsOpen(false)}
            >
              Make an Appointment
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              variant='outline'
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'mt-2 w-full rounded-xl border-0'
              )}
            >
              Close
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
