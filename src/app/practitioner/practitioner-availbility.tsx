import EmptyState from '@/components/general/empty-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
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
import { BundleEntry, PractitionerRoleAvailableTime, Slot } from 'fhir/r4';
import { useEffect, useMemo, useState } from 'react';

export default function PractitionerAvailbility({
  children,
  practitioner
}: any) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  // const { state: bookingState, dispatch } = useBooking();
  // const selectedDay = parseInt(format(bookingState.date, 'd'));
  // const selectedYear = bookingState.date.getFullYear();
  // const selectedMonth = bookingState.date.getMonth() + 1;

  // TODO: save selected schedule id to localstorage when user attempts to book
  const { data: schedule, isLoading } = useFindAvailability({
    practitionerRoleId: practitioner.practitionerRole.id,
    dateReference: selectedDate
  });

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

    // Loop through available times and days of the week
    availableTime.forEach(({ daysOfWeek }) => {
      daysOfWeek.forEach((day: string) => {
        const dayIndex = daysOfWeekMap[day];

        const firstDayOfMonth = new Date(
          month.getFullYear(),
          month.getMonth(),
          1
        );

        // Find the first occurrence of the specified day
        let currentDate = new Date(firstDayOfMonth);
        while (currentDate.getDay() !== dayIndex) {
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Add every occurrence of the specified day in the month (once a week)
        while (currentDate.getMonth() === month.getMonth()) {
          availableDays.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 7); // +7 to move to the next week
        }
      });
    });

    return availableDays;
  };

  const listAvailableDate = getAvailableDays(
    practitioner.practitionerRole.availableTime,
    today
  );

  const isDateAvailable = (date: Date, availableDays: Date[]): boolean => {
    return availableDays.some(
      availableDate =>
        date.getFullYear() === availableDate.getFullYear() &&
        date.getMonth() === availableDate.getMonth() &&
        date.getDate() === availableDate.getDate()
    );
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
    if (!selectedDate) return [];

    const dayOfWeek = format(selectedDate, 'eee').toLowerCase().substring(0, 3);

    const availableTimesForDay =
      practitioner.practitionerRole.availableTime.filter(
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
      const slotStart = parse(slotTime, 'HH:mm', selectedDate);
      const slotEnd = addMinutes(slotStart, 30);

      /* Check if the busy slot is on the same day as the selected date
       * and if the available slot overlaps with the busy slot by ensuring the available slot starts before the busy slot ends
       * and ends after the busy slot starts.
       * */
      const isUnavailable = unavailableSlots.some(slot => {
        const busyStart = slot.start;
        const busyEnd = slot.end;
        const sameDay = isSameDay(busyStart, selectedDate);
        const beforeEnd = isBefore(slotStart, busyEnd);
        const afterStart = isAfter(slotEnd, busyStart);

        return sameDay && beforeEnd && afterStart;
      });

      return {
        time: slotTime,
        isUnavailable
      };
    });
  }, [
    selectedDate,
    practitioner.practitionerRole.availableTime,
    unavailableSlots
  ]);

  useEffect(() => {
    if (!selectedDate) {
      const initialDate = isDateAvailable(today, listAvailableDate)
        ? today
        : getNextAvailableDate(today, listAvailableDate);

      setSelectedDate(initialDate);
    }
  }, [listAvailableDate]);

  const formattedTime = selectedDate ? format(selectedDate, 'HH:mm') : '';

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
            <div className='mx-auto text-[20px] font-bold'>See Availbility</div>
            <div className='mt-4 flex w-full flex-col justify-center'>
              <Calendar
                defaultMonth={selectedDate}
                mode='single'
                selected={selectedDate}
                onSelect={date => {
                  setSelectedDate(date);
                }}
                onMonthChange={params => {
                  if (params.getMonth() === today.getMonth()) {
                    setSelectedDate(addDays(today, 1));
                  } else {
                    setSelectedDate(params);
                  }
                }}
                disabled={date => !isDateAvailable(date, listAvailableDate)}
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
                {selectedDate && format(selectedDate, 'dd MMMM yyyy')}
              </div>
              {isLoading ? (
                <div>loading</div>
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
                  {availableTimeSlots.map(({ time, isUnavailable }) => (
                    <Button
                      variant='outline'
                      key={time}
                      disabled={isUnavailable}
                      // onClick={() =>
                      //   handleFilterChange('time', availabilityTime)
                      // }
                      className={cn(
                        'w-full items-center justify-center rounded-md border-0 px-4 py-2 text-[12px]',
                        time === formattedTime
                          ? 'bg-secondary font-bold text-white hover:bg-secondary'
                          : 'bg-white font-normal'
                      )}
                    >
                      {time}
                    </Button>
                  ))}
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
                'mt-4 w-full border-0'
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

// previously implemented
// const { data: availability, isLoading: isAvailabilityLoading } =
//   useFindAvailability({
//     year: selectedYear,
//     month: selectedMonth,
//     practitioner_role_id:
//       bookingState.detailClinicianByClinicianID?.practitioner_role_id,
//     enable: !!(
//       isOpen &&
//       bookingState.detailClinicianByClinicianID?.practitioner_role_id
//     )
//   })
//
// const handleFilterChange = (label: string, value: any) => {
//   dispatch({
//     type: 'UPDATE_BOOKING_INFO',
//     payload: {
//       [label]: value
//     }
//   });
// };
//
// const availabilityOnselectedDay =
//   availability?.data?.days?.[selectedDay - 1]?.available_times || null;
//
// const listAvailableDate = isAvailabilityLoading
//   ? []
//   : availability.data.days
//       .filter(day => day.available_times !== null)
//       .map(item => new Date(item.date)) || [];
//
// console.log({ listAvailableDate });
//
//   <Drawer onClose={() => setIsOpen(false)} open={isOpen}>
//     <DrawerTrigger asChild>
//       <div onClick={() => setIsOpen(true)}>{children}</div>
//     </DrawerTrigger>
//     <DrawerContent
//       onInteractOutside={() => setIsOpen(false)}
//       className='mx-auto max-w-screen-sm p-4'
//     >
//       <div className='mt-4'>
//         <div className='flex flex-col'>
//           <div className='mx-auto text-[20px] font-bold'>See Availbility</div>
//           <div className='mt-4 flex w-full flex-col justify-center'>
//             <Calendar
//               defaultMonth={bookingState.date}
//               mode='single'
//               selected={bookingState.date}
//               onSelect={date => {
//                 if (date) {
//                   handleFilterChange('date', date);
//                   handleFilterChange('time', null);
//                 }
//               }}
//               onMonthChange={params => {
//                 if (params.getMonth() === today.getMonth()) {
//                   handleFilterChange('date', addDays(today, 1));
//                 } else {
//                   handleFilterChange('date', params);
//                 }
//               }}
//               disabled={{ before: today }}
//               modifiers={{
//                 ada: listAvailableDate
//               }}
//               modifiersClassNames={{ ada: '!text-secondary' }}
//               classNames={{
//                 month: 'space-y-8 w-full',
//                 head_row: 'flex w-full',
//                 head_cell:
//                   'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] w-full',
//                 cell: 'w-full h-9 [&:has([aria-selected].day-outside)]:bg-secondary [&:has([aria-selected].day-outside)]:rounded-md [&:has([aria-selected].day-outside)]:text-accent-foreground  focus-within:z-20',
//                 day: cn(
//                   buttonVariants({ variant: 'ghost' }),
//                   'h-9 p-0 font-normal aria-selected:opacity-100 w-full text-[red]'
//                 ),
//                 day_selected:
//                   'bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground !text-white !rounded-md',
//                 day_today:
//                   'text-accent-foreground font-bold border-b-2 border-secondary rounded-none'
//               }}
//             />
//           </div>
//           <div className='card mt-4 border-0 bg-[#F9F9F9]'>
//             <div className='mb-4 font-bold'>
//               {format(bookingState.date, 'dd MMMM yyyy')}
//             </div>
//             {isAvailabilityLoading ? (
//               <div>loading</div>
//             ) : !availabilityOnselectedDay?.length ? (
//               <div className='flex w-full justify-center'>
//                 <EmptyState
//                   size={42}
//                   title='Jadwal tidak tersedia'
//                   subtitle='coba hari lain'
//                 />
//               </div>
//             ) : (
//               <div className='grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] justify-center gap-x-1 gap-y-2'>
//                 {availabilityOnselectedDay.map(availabilityTime => (
//                   <Button
//                     variant='outline'
//                     key={`${selectedDay} ${availabilityTime}`}
//                     onClick={() =>
//                       handleFilterChange('time', availabilityTime)
//                     }
//                     className={cn(
//                       'w-full items-center justify-center rounded-md border-0 px-4 py-2 text-[12px]',
//                       availabilityTime === bookingState.time
//                         ? 'bg-secondary font-bold text-white hover:bg-secondary'
//                         : 'bg-white font-normal'
//                     )}
//                   >
//                     {availabilityTime}
//                   </Button>
//                 ))}
//               </div>
//             )}
//           </div>
//
//           <Button
//             className='mt-4 rounded-xl bg-secondary text-white'
//             onClick={() => setIsOpen(false)}
//           >
//             Make an Appointment
//           </Button>
//           <Button
//             onClick={() => setIsOpen(false)}
//             variant='outline'
//             className={cn(
//               buttonVariants({ variant: 'outline' }),
//               'mt-4 w-full border-0'
//             )}
//           >
//             Close
//           </Button>
//         </div>
//       </div>
//     </DrawerContent>
//   </Drawer>
// );
