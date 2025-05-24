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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import { cn, conjunction } from '@/lib/utils';
import { useCreateAppointment } from '@/services/api/appointments';
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
  Bundle,
  BundleEntry,
  PractitionerRole,
  PractitionerRoleAvailableTime,
  Slot
} from 'fhir/r4';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

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
  scheduleId: string;
};

export default function PractitionerAvailbility({
  children,
  practitionerRole,
  scheduleId
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const router = useRouter();
  const params = useParams();
  const practitionerId = params.practitionerId;
  const searchParams = useSearchParams();
  const isOpenParam = searchParams.get('isOpen');

  const [isOpen, setIsOpen] = useState(false);
  const { state: bookingState, dispatch } = useBooking();
  const { state: authState } = useAuth();
  const [bookingForm, setBookingInformation] = useState({
    session_type: 'offline',
    problem_brief: ''
  });
  const [errorForm, setErrorForm] = useState(undefined);
  const {
    mutateAsync: createAppointment,
    isLoading: isCreateAppointmentLoading
  } = useCreateAppointment();

  const patientId = authState?.userInfo?.fhirId;
  const isAuthenticated = authState?.isAuthenticated;

  /* when the modal is opened via the "isOpen=true" URL param,
   * load temporary booking data from localStorage (if any),
   * apply it to the booking form and global state,
   * and remove the temporary data afterward. */
  useEffect(() => {
    if (isOpenParam === 'true') {
      setIsOpen(true);

      const tempData = localStorage.getItem('temp-booking');
      if (tempData) {
        try {
          const parsed = JSON.parse(tempData);
          setBookingInformation(() => ({
            schedule_id: parsed.scheduleId,
            session_type: parsed.sessionType,
            problem_brief: parsed.problemBrief,
            practitioner_role_id: parsed.practitionerRoleId,
            practitioner_available_time: parsed.practitionerAvailableTime
          }));

          handleFilterChange('date', new Date(parsed.date));
          handleFilterChange('startTime', parsed.startTime);
          handleFilterChange('hasUserChosenDate', parsed.hasUserChosenDate);

          localStorage.removeItem('temp-booking');
        } catch (e) {
          console.error('Invalid localStorage data');
        }
      }
    }
  }, [isOpenParam]);

  const handleBookingInformationChange = (key: string, value: any) => {
    setBookingInformation(prevState => ({
      ...prevState,
      [key]: value
    }));
  };

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

  /* generate time slots at 30-minute intervals
   * based on the practitioner's start and end times */
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

  useEffect(() => {
    if (isOpenParam === 'true') return;

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

  useEffect(() => {
    if (errorForm) {
      if (
        bookingState?.date &&
        bookingState?.startTime &&
        bookingForm.session_type &&
        bookingForm.problem_brief
      )
        setErrorForm(null);
    }
  }, [bookingForm, bookingState.date, bookingState.startTime]);

  /* validate the selected date and time:
   * if the selected date is unavailable, set the next available date and reset the time.
   * if the selected time is unavailable, set the next available time after the current selection.
   * if no time is available, move to the next valid date and reset the time.
   * dependencies: re-run when selected date/time, available time slots, or valid date list changes. */
  useEffect(() => {
    if (!availableTimeSlots.length) return;
    if (isOpenParam !== 'true') return;

    const isValidDate = isDateAvailable(bookingState.date, listAvailableDate);
    const validTimeSlots = availableTimeSlots
      .filter(slot => !slot.isUnavailable)
      .map(slot => slot.startTime);

    const isValidTime = validTimeSlots.includes(bookingState.startTime);

    if (!isValidDate) {
      const nextValidDate = getNextAvailableDate(
        bookingState.date,
        listAvailableDate
      );
      handleFilterChange('date', nextValidDate);
      handleFilterChange('startTime', null);
    } else if (!isValidTime) {
      const nextAvailableTime = validTimeSlots.find(
        time => time > bookingState.startTime
      );

      if (nextAvailableTime) {
        handleFilterChange('startTime', nextAvailableTime);
      } else {
        const nextValidDate = getNextAvailableDate(
          addDays(bookingState.date, 1),
          listAvailableDate
        );
        handleFilterChange('date', nextValidDate);
        handleFilterChange('startTime', null); // re-trigger the logic
      }
    }
  }, [
    bookingState.date,
    bookingState.startTime,
    availableTimeSlots,
    listAvailableDate
  ]);

  const handleSubmitForm = async () => {
    const { date, startTime } = bookingState;
    const conditionRandomUUID = uuidv4();
    const slotRandomUUID = uuidv4();
    const requiredData = {
      'Problem Brief': bookingForm.problem_brief,
      'Tanggal Appointment': date,
      'Jam Appointment': startTime,
      'Tipe Session': bookingForm.session_type
    };

    let emptyField = Object.entries(requiredData).filter(item => !item[1]);

    if (emptyField.length > 0) {
      setErrorForm(emptyField.map(item => item[0]));
    } else {
      const formattedStartTime = parse(startTime, 'HH:mm', date).toISOString();
      const formattedEndTime = addMinutes(formattedStartTime, 30).toISOString();

      const appointmentPayload: Bundle = {
        type: 'transaction',
        resourceType: 'Bundle',
        entry: [
          {
            request: {
              method: 'PUT',
              url: `Condition/${conditionRandomUUID}`
            },
            resource: {
              evidence: [
                {
                  code: [
                    {
                      text: bookingForm.problem_brief
                    }
                  ]
                }
              ],
              resourceType: 'Condition',
              asserter: {
                reference: `Patient/${patientId}`
              },
              id: conditionRandomUUID,
              subject: {
                reference: `Patient/${patientId}`
              }
            }
          },
          {
            request: {
              method: 'PUT',
              url: `Slot/${slotRandomUUID}`
            },
            resource: {
              schedule: {
                reference: `Schedule/${scheduleId}`
              },
              start: formattedStartTime,
              resourceType: 'Slot',
              status: 'busy-unavailable',
              id: slotRandomUUID,
              end: formattedEndTime
            }
          },
          {
            request: {
              method: 'POST',
              url: 'Appointment'
            },
            resource: {
              slot: [
                {
                  reference: `Slot/${slotRandomUUID}`
                }
              ],
              participant: [
                {
                  status: 'accepted',
                  actor: {
                    reference: `Patient/${patientId}`
                  }
                },
                {
                  status: 'accepted',
                  actor: {
                    reference: `Practitioner/${practitionerId}`
                  }
                },
                {
                  status: 'accepted',
                  actor: {
                    reference: `PractitionerRole/${practitionerRole.id}`
                  }
                }
              ],
              resourceType: 'Appointment',
              appointmentType: {
                text: bookingForm.session_type
              },
              status: 'booked',
              reasonReference: [
                {
                  reference: `Condition/${conditionRandomUUID}`
                }
              ]
            }
          }
        ]
      };
      const result = await createAppointment(appointmentPayload);
      if (result && result.length > 0) {
        handleFilterChange('isBookingSubmitted', true);
        setIsOpen(false);
      }
    }
  };

  const resetData = () => {
    handleFilterChange('startTime', null);
    handleBookingInformationChange('problem_brief', '');
    setErrorForm(null);
  };

  return (
    <Drawer onClose={() => setIsOpen(false)} open={isOpen}>
      <DrawerTrigger asChild>
        <div onClick={() => setIsOpen(true)}>{children}</div>
      </DrawerTrigger>
      <DrawerContent
        onInteractOutside={() => setIsOpen(false)}
        className='fixed bottom-0 left-0 right-0 mx-auto flex h-[85%] max-w-screen-sm flex-col bg-white p-4'
      >
        <div className='mt-4 h-full overflow-y-auto px-1 scrollbar-hide'>
          <div className='flex h-full flex-col'>
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
                  if (!date) return;
                  handleFilterChange('date', date);
                  handleFilterChange('hasUserChosenDate', true);
                  resetData();
                }}
                onMonthChange={params => {
                  if (!params) return;
                  if (params.getMonth() === today.getMonth()) {
                    handleFilterChange('date', addDays(today, 1));
                  } else {
                    handleFilterChange('date', params);
                  }
                  resetData();
                }}
                disabled={date =>
                  date < today ||
                  !listAvailableDate.some(
                    availableDate => availableDate.getTime() === date.getTime()
                  )
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

            <div className='card my-4 border-0 bg-[#F9F9F9]'>
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
                        disabled={isUnavailable || !scheduleId}
                        onClick={() => {
                          handleFilterChange('startTime', startTime);
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

            {bookingState.startTime && (
              <>
                <div className='text-[12px] font-bold'>Session Type</div>
                <div className='mt-2 flex space-x-4'>
                  <Select disabled>
                    <SelectTrigger className='w-[50%] text-[12px] text-[#2C2F35]'>
                      <SelectValue placeholder='Offline' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup className='text-[12px] text-[#2C2F35]'>
                        <SelectItem value='online'>Online</SelectItem>
                        <SelectItem value='offline'>Offline</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className='mt-4 text-[12px] font-bold'>Problem Brief</div>
                <div className='mb-4 mt-2'>
                  <Textarea
                    value={bookingForm.problem_brief}
                    onChange={e =>
                      handleBookingInformationChange(
                        'problem_brief',
                        e.target.value
                      )
                    }
                    placeholder='Type your message here.'
                    className='w-full resize-none text-[12px] text-[#2C2F35]'
                  />
                </div>

                {errorForm && (
                  <div className='mb-4 text-sm text-destructive'>
                    {`Lengkapi ${conjunction(errorForm)}.`}
                  </div>
                )}
              </>
            )}

            {isAuthenticated ? (
              <Button
                className='mt-auto rounded-xl bg-secondary text-white'
                onClick={handleSubmitForm}
                disabled={isCreateAppointmentLoading || !scheduleId}
              >
                {isCreateAppointmentLoading ? (
                  <LoadingSpinnerIcon
                    stroke='white'
                    width={20}
                    height={20}
                    className='animate-spin'
                  />
                ) : (
                  'Make An Appointment'
                )}
              </Button>
            ) : (
              <Button
                className='mt-auto w-full rounded-[32px] bg-secondary py-2 text-[14px] font-bold text-white'
                onClick={() => {
                  localStorage.setItem(
                    'temp-booking',
                    JSON.stringify({
                      date: bookingState.date,
                      startTime: bookingState.startTime,
                      sessionType: bookingForm.session_type,
                      problemBrief: bookingForm.problem_brief,
                      hasUserChosenDate: bookingState.hasUserChosenDate
                    })
                  );
                  localStorage.setItem(
                    'redirect',
                    encodeURIComponent(
                      `/practitioner/${practitionerId}?isOpen=true`
                    )
                  );

                  router.push('/auth');
                }}
              >
                Silakan Daftar atau Masuk untuk Booking
              </Button>
            )}
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
