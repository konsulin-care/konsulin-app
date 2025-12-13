import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar-temp';
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
import { getAPI } from '@/services/api';
import {
  useCreateAppointment,
  usePayAppointment
} from '@/services/api/appointments';
import { useFindAvailability } from '@/services/clinicians';
import { clearIntent, getIntent, saveIntent } from '@/utils/intent-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDays,
  addMinutes,
  format,
  isBefore,
  parse,
  parseISO
} from 'date-fns';
import { BundleEntry, PractitionerRole, Slot } from 'fhir/r4';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState, useTransition } from 'react';

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
  invoice?: any;
  practitionerName?: string;
  practitionerOrganizationName?: string;
  practitionerAvatar?: {
    photoUrl?: string;
    initials?: string;
    backgroundColor?: string;
  };
};

/**
 * Render availability UI and booking/payment flows for a practitioner's role.
 *
 * Renders a calendar of available dates, selectable time-slot pills, a booking drawer
 * and a payment drawer that handle booking form state, validation, authentication redirects,
 * and payment actions.
 *
 * @param children - Trigger element(s) that open the booking drawer when clicked
 * @param practitionerRole - FHIR PractitionerRole containing availability (period, availableTime, id)
 * @param scheduleId - Optional Schedule ID used to enable slot selection and booking actions
 * @param invoice - Optional invoice object used to display total and perform payment actions
 * @param practitionerName - Optional practitioner display name shown in the payment drawer
 * @param practitionerOrganizationName - Optional organization name shown in the payment drawer
 * @param practitionerAvatar - Optional avatar data (photoUrl, initials, backgroundColor) shown in the payment drawer
 * @returns The component's rendered booking and payment interface (JSX)
 */
export default function PractitionerAvailability({
  children,
  practitionerRole,
  scheduleId,
  invoice,
  practitionerName,
  practitionerOrganizationName,
  practitionerAvatar
}: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const router = useRouter();
  const params = useParams();
  const practitionerId = params.practitionerId;
  const searchParams = useSearchParams();
  const isOpenParam = searchParams.get('isOpen');

  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const { state: bookingState, dispatch } = useBooking();
  const { state: authState } = useAuth();
  const [bookingForm, setBookingInformation] = useState({
    session_type: 'offline',
    problem_brief: ''
  });
  const [errorForm, setErrorForm] = useState(undefined);
  const queryClient = useQueryClient();
  const {
    mutateAsync: createAppointment,
    isLoading: isCreateAppointmentLoading
  } = useCreateAppointment();
  const { mutateAsync: payAppointment, isLoading: isPaying } =
    usePayAppointment();

  const patientId = authState?.userInfo?.fhirId;
  const isAuthenticated = authState?.isAuthenticated;

  // Fetch Schedule by ID with caching (only when authenticated)
  const { data: scheduleById } = useQuery({
    queryKey: ['schedule-by-id', scheduleId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(`/fhir/Schedule/${scheduleId}`);
      return response.data || null;
    },
    enabled: !!scheduleId && !!isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  /* when the modal is opened via the "isOpen=true" URL param,
   * load temporary booking data from localStorage (if any),
   * apply it to the booking form and global state,
   * and remove the temporary data afterward. */
  useEffect(() => {
    const intent = getIntent();
    if (intent && intent.kind === 'appointment') {
      if (intent.payload.path.includes(practitionerId as string)) {
        const { slot, formData } = intent.payload;
        setBookingInformation(formData);
        handleFilterChange('date', new Date(slot.date));
        handleFilterChange('startTime', slot.startTime);
        handleFilterChange('hasUserChosenDate', true);
        if (slot.slotId) {
          setSelectedSlotId(slot.slotId);
        }
        setIsOpen(true);
        clearIntent();
        return;
      }
    }

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

  useEffect(() => {
    if (isOpenParam !== 'true') {
      const initialDate = isDateAvailable(today, listAvailableDate)
        ? today
        : getNextAvailableDate(today, listAvailableDate);

      if (
        bookingState.date.getTime() !== initialDate.getTime() &&
        !bookingState.hasUserChosenDate
      ) {
        handleFilterChange('date', initialDate);
      }
    }
  }, [isOpenParam]);

  const handleBookingInformationChange = (key: string, value: any) => {
    setBookingInformation(prevState => ({
      ...prevState,
      [key]: value
    }));
  };

  // Derive practitioner timezone offset from PractitionerRole.period.start (e.g., +07:00)
  const practitionerTzOffset = useMemo(() => {
    const iso =
      practitionerRole?.period?.start || practitionerRole?.period?.end;
    if (typeof iso === 'string') {
      const match = iso.match(/([+-]\d{2}:\d{2}|Z)$/);
      return match ? match[1] : 'Z';
    }
    return 'Z';
  }, [practitionerRole?.period?.start, practitionerRole?.period?.end]);

  // Build practitioner-TZ day window strings and day cache key
  const { startFrom, startTo, dayKey } = useMemo(() => {
    if (!bookingState.date) {
      return {
        startFrom: undefined,
        startTo: undefined,
        dayKey: undefined
      } as {
        startFrom?: string;
        startTo?: string;
        dayKey?: string;
      };
    }
    const dayStr = format(bookingState.date, 'yyyy-MM-dd');
    const start = `${dayStr}T00:00:00${practitionerTzOffset}`;
    const end = `${dayStr}T23:59:59${practitionerTzOffset}`;
    return {
      startFrom: start,
      startTo: end,
      dayKey: `${dayStr}${practitionerTzOffset}`
    };
  }, [bookingState.date, practitionerTzOffset]);

  const {
    data: schedule,
    isLoading,
    isError
  } = useFindAvailability({
    practitionerRoleId: practitionerRole.id,
    startFrom,
    startTo,
    dayKey
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

    if (availableDays.length === 0) {
      return date;
    }

    // Early check: if all dates in availableDays are in the past, just return the input date
    const now = new Date();
    let allInPast = true;
    for (let i = 0; i < availableDays.length; i++) {
      if (availableDays[i] >= now) {
        allInPast = false;
        break;
      }
    }
    if (allInPast) {
      return date;
    }

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

  // Map FHIR Slots to pill items with disabled state
  const slotPills = useMemo(() => {
    if (!schedule || !Array.isArray(schedule))
      return [] as Array<{
        id: string;
        displayLabel: string;
        value: string; // HH:mm start time used for booking state
        start: Date;
        end: Date;
        disabled: boolean;
        status: string;
      }>;

    const entries = schedule.filter(
      (entry: BundleEntry) => entry.resource.resourceType === 'Slot'
    ) as BundleEntry<Slot>[];

    const now = new Date();
    const mapped = entries.map(entry => {
      const s = parseISO(entry.resource.start);
      const e = parseISO(entry.resource.end);
      const status = entry.resource.status;
      const disabledByStatus = status !== 'free';
      const disabledByPast = isBefore(s, now);
      return {
        id: entry.resource.id,
        displayLabel: `${format(s, 'HH:mm')}`,
        value: `${format(s, 'HH:mm')}`,
        start: s,
        end: e,
        disabled: disabledByStatus || disabledByPast,
        status
      };
    });

    return mapped.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [schedule]);

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
   * dependencies: re-run when selected date/time, available time slots, or valid date list changes.
   * */
  useEffect(() => {
    if (slotPills.length === 0 || isOpenParam !== 'true') return;

    const params = new URLSearchParams(window.location.search);

    const isValidDate = isDateAvailable(bookingState.date, listAvailableDate);
    const validTimeSlots = slotPills.filter(p => !p.disabled).map(p => p.value);

    const isValidTime = validTimeSlots.includes(bookingState.startTime);

    if (!isValidDate) {
      const nextValidDate = getNextAvailableDate(
        bookingState.date,
        listAvailableDate
      );
      handleFilterChange('date', nextValidDate);
      handleFilterChange('startTime', null);

      params.delete('isOpen');
      router.push(`?${params.toString()}`, { scroll: false });

      return;
    }

    if (!isValidTime) {
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
        handleFilterChange('startTime', null);

        params.delete('isOpen');
        router.push(`?${params.toString()}`, { scroll: false });
        return;
      }
    }

    params.delete('isOpen');
    router.push(`?${params.toString()}`, { scroll: false });
  }, [bookingState.date, bookingState.startTime, slotPills, listAvailableDate]);

  const handleSubmitForm = async () => {
    const { date, startTime } = bookingState;
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
      // Open payment option modal instead of client-side FHIR bundle submit
      setPaymentOpen(true);
    }
  };

  const resetData = () => {
    handleFilterChange('startTime', null);
    handleBookingInformationChange('problem_brief', '');
    setErrorForm(null);
  };

  // Helper function to extract slotMinutes from Schedule's comment field
  function getSlotMinutesText(schedule: any): string {
    if (!schedule) {
      return '';
    }
    if (typeof schedule !== 'object') {
      return '';
    }
    if (typeof schedule.comment !== 'string') {
      return '';
    }
    try {
      const commentObj = JSON.parse(schedule.comment);
      if (typeof commentObj.slotMinutes === 'number') {
        if (commentObj.slotMinutes > 0) {
          return ` ${commentObj.slotMinutes} Menit`;
        } else {
          return '';
        }
      } else {
        return '';
      }
    } catch (err) {
      return '';
    }
  }

  return (
    <>
      <Drawer onClose={() => setIsOpen(false)} open={isOpen}>
        <DrawerTrigger asChild>
          <div onClick={() => setIsOpen(true)}>{children}</div>
        </DrawerTrigger>
        <DrawerContent
          onInteractOutside={() => setIsOpen(false)}
          className='fixed right-0 bottom-0 left-0 mx-auto flex h-[85%] max-w-screen-sm flex-col bg-white p-4'
        >
          <div className='scrollbar-hide mt-4 h-full overflow-y-auto px-1'>
            <div className='flex h-full flex-col'>
              <DrawerTitle className='mx-auto text-[20px] font-bold'>
                See Availability
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
                  onMonthChange={month => {
                    if (!month) return;
                    // Update available dates for the new month
                    const newAvailableDays = getAvailableDays(
                      practitionerRole.availableTime,
                      month
                    );
                    // Find the first available date in the new month
                    const firstAvailable = newAvailableDays.find(
                      day => day >= month
                    );
                    if (firstAvailable) {
                      handleFilterChange('date', firstAvailable);
                    }
                    resetData();
                  }}
                  disabled={date =>
                    date < today ||
                    !listAvailableDate.some(
                      availableDate =>
                        availableDate.getTime() === date.getTime()
                    )
                  }
                />
              </div>

              <div className='card my-4 border-0 bg-[#F9F9F9]'>
                <div className='mb-4 font-bold'>
                  {bookingState.date &&
                    format(bookingState.date, 'dd MMMM yyyy')}
                </div>
                {isLoading ? (
                  <div className='flex h-[120px] items-center justify-center'>
                    <LoadingSpinnerIcon
                      width={50}
                      height={50}
                      className='w-full animate-spin'
                    />
                  </div>
                ) : isError ? (
                  <div className='flex w-full justify-center'>
                    <EmptyState
                      size={42}
                      title='Unable to load available slots'
                      subtitle='Please try again later'
                    />
                  </div>
                ) : slotPills.length === 0 ? (
                  <div className='flex w-full justify-center'>
                    <EmptyState
                      size={42}
                      title='No available time slots'
                      subtitle='Try another date'
                    />
                  </div>
                ) : (
                  <div className='grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] justify-center gap-x-1 gap-y-2'>
                    {slotPills.map(pill => (
                      <Button
                        variant='outline'
                        key={pill.id}
                        disabled={pill.disabled || !scheduleId}
                        onClick={() => {
                          handleFilterChange('startTime', pill.value);
                          setSelectedSlotId(pill.id);
                        }}
                        className={cn(
                          'w-full items-center justify-center rounded-md border-0 px-4 py-2 text-[12px]',
                          pill.value === bookingState.startTime
                            ? 'bg-secondary hover:bg-secondary font-bold text-white'
                            : 'bg-white font-normal'
                        )}
                        aria-disabled={pill.disabled}
                      >
                        {pill.displayLabel}
                      </Button>
                    ))}
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

                  <div className='mt-4 text-[12px] font-bold'>
                    Problem Brief
                  </div>
                  <div className='mt-2 mb-4'>
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
                    <div className='text-destructive mb-4 text-sm'>
                      {`Lengkapi ${conjunction(errorForm)}.`}
                    </div>
                  )}
                </>
              )}

              {isAuthenticated ? (
                <Button
                  className='bg-secondary mt-auto rounded-xl text-white disabled:opacity-50'
                  onClick={handleSubmitForm}
                  disabled={
                    isCreateAppointmentLoading ||
                    isPaying ||
                    !scheduleId ||
                    !bookingState.startTime ||
                    !bookingForm.problem_brief?.trim()
                  }
                >
                  {isCreateAppointmentLoading || isPaying ? (
                    <LoadingSpinnerIcon
                      stroke='white'
                      width={20}
                      height={20}
                      className='animate-spin'
                    />
                  ) : (
                    `Jadwalkan Sesi${getSlotMinutesText(scheduleById)}`
                  )}
                </Button>
              ) : (
                <Button
                  className='bg-secondary mt-auto w-full rounded-[32px] py-2 text-[14px] font-bold text-white'
                  disabled={isPending}
                  onClick={() => {
                    saveIntent('appointment', {
                      path: `/practitioner/${practitionerId}`,
                      slot: {
                        date: bookingState.date,
                        startTime: bookingState.startTime,
                        slotId: selectedSlotId
                      },
                      formData: bookingForm
                    });

                    startTransition(() => {
                      router.push('/auth');
                    });
                  }}
                >
                  {isPending ? (
                    <LoadingSpinnerIcon
                      stroke='white'
                      width={20}
                      height={20}
                      className='animate-spin'
                    />
                  ) : (
                    'Silakan Daftar atau Masuk untuk Booking'
                  )}
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
                Batalkan
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Payment Option Modal */}
      <Drawer onClose={() => setPaymentOpen(false)} open={paymentOpen}>
        <DrawerContent
          onInteractOutside={() => setPaymentOpen(false)}
          className='fixed right-0 bottom-0 left-0 mx-auto flex max-w-screen-sm flex-col bg-white p-4'
        >
          <div className='flex flex-col gap-4'>
            <div className='flex flex-col items-center'>
              {practitionerAvatar?.photoUrl ? (
                <img
                  src={practitionerAvatar.photoUrl}
                  alt='practitioner'
                  className='h-[72px] w-[72px] rounded-full object-cover'
                />
              ) : (
                <div
                  className='flex h-[72px] w-[72px] items-center justify-center rounded-full text-lg font-bold text-white'
                  style={{
                    backgroundColor:
                      practitionerAvatar?.backgroundColor || '#999'
                  }}
                >
                  {practitionerAvatar?.initials}
                </div>
              )}
              {practitionerOrganizationName && (
                <div className='mt-2 text-[12px] font-normal'>
                  {practitionerOrganizationName}
                </div>
              )}
              <div className='mt-1 text-center text-[18px] font-bold'>
                {practitionerName}
              </div>
            </div>

            <div className='flex w-full items-center justify-center gap-2'>
              <div className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'>
                <span className='mr-2 text-[12px] text-[#2C2F35]'>
                  {bookingState?.date
                    ? format(bookingState.date, 'dd MMMM yyyy')
                    : '-/-/-'}
                </span>
              </div>
              <div className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'>
                <span className='mr-2 text-[12px] text-[#2C2F35]'>
                  {bookingState?.startTime || '-:-'}
                </span>
              </div>
            </div>

            <div className='mt-2 flex items-center justify-between rounded-[12px] bg-[#F9F9F9] p-3'>
              <span className='text-[12px] text-[#666]'>Total</span>
              <span className='text-[16px] font-bold'>
                {invoice?.totalNet
                  ? new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: invoice.totalNet.currency,
                      minimumFractionDigits: 0
                    }).format(invoice.totalNet.value)
                  : '-'}
              </span>
            </div>

            <div className='mt-2 flex flex-col gap-2'>
              <Button
                className='bg-secondary w-full rounded-xl text-white disabled:opacity-50'
                disabled={
                  isPaying ||
                  !patientId ||
                  !invoice?.id ||
                  !selectedSlotId ||
                  !bookingForm.problem_brief?.trim()
                }
                onClick={async () => {
                  try {
                    const response = await payAppointment({
                      patientId: `Patient/${patientId}`,
                      invoiceId: `Invoice/${invoice.id}`,
                      useOnlinePayment: true,
                      practitionerRoleId: `PractitionerRole/${practitionerRole.id}`,
                      slotId: `Slot/${selectedSlotId}`,
                      condition: bookingForm.problem_brief
                    });

                    // If payment URL is returned, open it in a new tab
                    if (response?.data?.paymentUrl) {
                      window.open(response.data.paymentUrl, '_blank');
                    }

                    queryClient.invalidateQueries({
                      queryKey: ['find-availability', practitionerRole.id]
                    });
                    handleFilterChange('isBookingSubmitted', true);
                    setPaymentOpen(false);
                    setIsOpen(false);
                  } catch (e: any) {
                    // Errors are generally toasted by interceptor; ensure 501 is explicit
                    // no-op here; interceptor will show message
                  }
                }}
              >
                {isPaying ? (
                  <LoadingSpinnerIcon
                    stroke='white'
                    width={20}
                    height={20}
                    className='animate-spin'
                  />
                ) : (
                  'Bayar Sekarang'
                )}
              </Button>
              <Button
                variant='outline'
                className='w-full rounded-xl border-0'
                disabled={
                  isPaying ||
                  !patientId ||
                  !invoice?.id ||
                  !selectedSlotId ||
                  !bookingForm.problem_brief?.trim()
                }
                onClick={async () => {
                  try {
                    await payAppointment({
                      patientId: `Patient/${patientId}`,
                      invoiceId: `Invoice/${invoice.id}`,
                      useOnlinePayment: false,
                      practitionerRoleId: `PractitionerRole/${practitionerRole.id}`,
                      slotId: `Slot/${selectedSlotId}`,
                      condition: bookingForm.problem_brief
                    });
                    queryClient.invalidateQueries({
                      queryKey: ['find-availability', practitionerRole.id]
                    });
                    handleFilterChange('isBookingSubmitted', true);
                    setPaymentOpen(false);
                    setIsOpen(false);
                  } catch (e: any) {
                    // Errors toasted by interceptor
                  }
                }}
              >
                {isPaying ? (
                  <LoadingSpinnerIcon
                    width={20}
                    height={20}
                    className='animate-spin'
                  />
                ) : (
                  'Bayar Nanti'
                )}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
