/* eslint-disable max-lines, complexity, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import AppDrawer from '@/components/ui/app-drawer';
import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import { useFab } from '@/context/fabContext';
import { STORES, dbDelete, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import {
  useCreateAppointment,
  usePayAppointment
} from '@/services/api/appointments';
import { computeFreeSlots, useBusySlotsByPractitioner } from '@/services/slots';
import { saveIntent } from '@/utils/redirect-intent';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { Invoice, PractitionerRole } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from 'react';
import BookingCalendar from './booking-calendar';
import { getNextAvailableDate, isDateAvailable } from './booking-date-utils';
import BookingFormSection from './booking-form-section';
import { useBookingForm } from './hooks/use-booking-form';
import { useBookingRestoration } from './hooks/use-booking-restoration';
import { usePractitionerRole } from './hooks/usePractitionerRole';
import PaymentDrawer from './payment-drawer';
import TimeSlotsSection from './time-slots-section';
import {
  type AppointmentPayload,
  type TempBookingData,
  getAvailableDays
} from './utils';

type Props = {
  // Drawer mode props
  children?: ReactNode;
  practitionerRole?: PractitionerRole;
  scheduleId?: string;
  // Common props
  invoice?: Invoice;
  practitionerName?: string;
  practitionerOrganizationName?: string;
  practitionerAvatar?: {
    photoUrl?: string;
    initials?: string;
    backgroundColor?: string;
  };
  // Page mode props
  variant?: 'drawer' | 'page';
  practitionerRoleId?: string;
  durationMinutes?: number;
  healthcareServiceId?: string;
  healthcareServiceName?: string;
  organizationId?: string;
};

/**
 * Render availability UI and booking/payment flows for a practitioner's role.
 *
 * In drawer mode (default), wraps content in a Drawer with trigger children.
 * In page mode, renders content directly, fetching practitioner data
 * internally and computing free slots dynamically based on service duration.
 *
 * @param children - Trigger element(s) that open the booking drawer when clicked (drawer mode)
 * @param practitionerRole - FHIR PractitionerRole with availability (drawer mode)
 * @param scheduleId - Schedule ID used to enable slot selection (drawer mode)
 * @param invoice - Optional invoice object for payment display
 * @param practitionerName - Practitioner display name shown in payment drawer
 * @param practitionerOrganizationName - Organization name shown in payment drawer
 * @param practitionerAvatar - Avatar data (photoUrl, initials, backgroundColor)
 * @param variant - 'drawer' (default) or 'page'
 * @param practitionerRoleId - PractitionerRole ID for internal fetch (page mode)
 * @param durationMinutes - Service duration for free-slot computation (page mode, default 60)
 * @returns The component's rendered booking and payment interface (JSX)
 */
export default function PractitionerAvailability({
  children,
  practitionerRole,
  scheduleId,
  invoice,
  practitionerName,
  practitionerOrganizationName,
  practitionerAvatar,
  variant = 'drawer',
  practitionerRoleId,
  durationMinutes = 60,
  healthcareServiceId: propHealthcareServiceId,
  healthcareServiceName: propHealthcareServiceName,
  organizationId: propOrganizationId
}: Props) {
  // Stable date reference — only changes at midnight.
  const today = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return todayDate;
  }, []);
  const isPageMode = variant === 'page';
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOpenParam = searchParams.get('isOpen');

  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const { state: bookingState, dispatch } = useBooking();
  const { state: authState } = useAuth();
  const { dispatch: fabDispatch } = useFab();
  const queryClient = useQueryClient();
  const { isPending: isCreateAppointmentLoading } = useCreateAppointment();
  const { mutateAsync: payAppointment, isPending: isPaying } =
    usePayAppointment();

  const patientId = authState?.userInfo?.fhirId;
  const isAuthenticated = authState?.isAuthenticated;

  const {
    detail,
    isDetailLoading,
    practitionerId,
    practitionerGivenName,
    healthcareServiceNames,
    effectiveRole,
    effectiveAvailableTime,
    effectiveScheduleId,
    practitionerTzOffset
  } = usePractitionerRole(
    isPageMode,
    practitionerRoleId,
    practitionerRole,
    scheduleId
  );

  const [pageDate, setPageDate] = useState<Date>(startOfDay(new Date()));

  const {
    bookingForm,
    setBookingInformation,
    errorForm,
    relayInvoice,
    handleBookingInformationChange,
    handleSubmitForm,
    handleSubmitFormRef,
    setErrorForm
  } = useBookingForm({
    isPageMode,
    effectiveScheduleId,
    practitionerId,
    durationMinutes,
    propHealthcareServiceId,
    propOrganizationId,
    detail,
    effectiveRole,
    pageDate,
    patientId,
    setSelectedSlotId,
    setPaymentOpen
  });

  const listAvailableDate = getAvailableDays(
    effectiveAvailableTime,
    isPageMode ? pageDate : bookingState.date
  );

  /** Dispatch a booking info update to the reducer. */
  const handleFilterChange = (
    label: string,
    value: string | Date | boolean | undefined
  ) => {
    dispatch({
      type: 'UPDATE_BOOKING_INFO',
      payload: {
        [label]: value
      }
    });
  };

  /** Reset time slot and errors, but preserve problem brief text. */
  const resetData = () => {
    handleFilterChange('startTime', null);
    setErrorForm(null);
  };

  /** When the calendar navigates to a new month: auto-select the earliest
   *  available date so the Slot query fires and dates are clickable. */
  const handleMonthChange = useCallback(
    (month: Date) => {
      if (!isPageMode || effectiveAvailableTime.length === 0) return;
      const daysInNewMonth = getAvailableDays(effectiveAvailableTime, month);
      const earliest = daysInNewMonth
        .filter(d => d >= today)
        .toSorted((a, b) => a.getTime() - b.getTime())[0];
      if (earliest) setPageDate(earliest);
      // resetData() is called by BookingCalendar's onMonthChange after this.
    },
    [isPageMode, effectiveAvailableTime, today]
  );

  // Selected date unified across modes
  const selectedDate = isPageMode ? pageDate : bookingState.date;

  // Cross-mode: compute date string for slot queries
  const dateStr = useMemo(
    () => (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''),
    [selectedDate]
  );

  // Fetch busy slots across all practitioner roles
  const { data: busySlots, isLoading: isBusySlotsLoading } =
    useBusySlotsByPractitioner(practitionerId, dateStr);

  // Compute free slots for both modes (converts to browser's local timezone)
  const computedFreeSlots = useMemo(() => {
    if (!selectedDate || !busySlots) return [];
    return computeFreeSlots(
      effectiveAvailableTime,
      busySlots,
      selectedDate,
      durationMinutes,
      practitionerTzOffset
    );
  }, [
    selectedDate,
    busySlots,
    effectiveAvailableTime,
    durationMinutes,
    practitionerTzOffset
  ]);

  // Fetch Schedule by ID with caching (only when authenticated)
  const { data: scheduleById } = useQuery({
    queryKey: ['schedule-by-id', effectiveScheduleId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(`/fhir/Schedule/${effectiveScheduleId}`);
      return response.data || null;
    },
    enabled: Boolean(effectiveScheduleId) && (isAuthenticated ?? false),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const onRestoreAppointment = useCallback((payload: AppointmentPayload) => {
    const { slot, formData } = payload;
    setBookingInformation(formData);
    handleFilterChange('date', new Date(slot.date));
    handleFilterChange('startTime', slot.startTime);
    handleFilterChange('hasUserChosenDate', true);
    if (slot.slotId) setSelectedSlotId(slot.slotId);
    setIsOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLoadTempBooking = useCallback((userId: string) => {
    setIsOpen(true);

    dbGet<TempBookingData>(STORES.tempBooking, userId)
      .then(parsed => {
        if (parsed) {
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
        }
        return parsed;
      })
      .then(() => {
        return userId ? dbDelete(STORES.tempBooking, userId) : undefined;
      })
      .catch(() => {
        // Best-effort load — ignore errors
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const practitionerRoleIdStr = practitionerRole?.id ?? '';
  const authUserId = authState?.userInfo?.userId;

  useBookingRestoration({
    isPageMode,
    isOpenParam,
    practitionerRoleId: practitionerRoleIdStr,
    authUserId,
    onRestoreAppointment,
    onLoadTempBooking
  });

  // Track whether page mode has been initialized with a valid start date.
  // Using a ref ensures this runs only once on mount, not on every render.
  const pageDateInitialized = useRef(false);

  /** Set initial date for page mode — runs only once on mount. */
  useEffect(() => {
    if (!isPageMode) return;
    if (pageDateInitialized.current) return;
    pageDateInitialized.current = true;
    const initialDate = isDateAvailable(today, listAvailableDate)
      ? today
      : getNextAvailableDate(today, listAvailableDate);
    // Avoid unnecessary state update if pageDate already matches.
    if (pageDate?.getTime() === initialDate.getTime()) return;
    setPageDate(initialDate);
    // pageDate is intentionally excluded from deps to prevent re-initialization
    // when the user changes the selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPageMode, today, listAvailableDate]);

  useEffect(() => {
    if (isPageMode) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpenParam]);

  // Slot pills: map computed free windows to pill format (both modes)
  const slotPills = useMemo(() => {
    if (!computedFreeSlots || computedFreeSlots.length === 0) return [];
    return computedFreeSlots.map(fs => ({
      id: `free-${fs.start}-${fs.end}`,
      displayLabel: fs.start,
      value: fs.start,
      start: parseISO(`1970-01-01T${fs.start}:00`),
      end: parseISO(`1970-01-01T${fs.end}:00`),
      disabled: false,
      status: 'free'
    }));
  }, [computedFreeSlots]);

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

    if (isValidDate === false) {
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

    if (isValidTime === false) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingState.date, bookingState.startTime, slotPills, listAvailableDate]);

  const isFormValid =
    isPageMode &&
    Boolean(bookingState.startTime) &&
    Boolean(bookingForm.problem_brief.trim());

  // Sync FAB action state to show "Book Now" when form is ready in page mode
  useEffect(() => {
    if (isPageMode && isFormValid) {
      fabDispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Book Now',
          onAction: () => handleSubmitFormRef.current(),
          isSaving: false,
          variant: 'primary'
        }
      });
    } else {
      fabDispatch({ type: 'SET_ACTION', config: null });
    }

    return () => {
      fabDispatch({ type: 'SET_ACTION', config: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormValid, isPageMode, fabDispatch]);

  const effectiveBookingState = isPageMode
    ? ({
        date: pageDate,
        startTime: bookingState.startTime ?? '',
        hasUserChosenDate: false
      } as IStateBooking)
    : bookingState;

  const effectiveHandleFilterChange = isPageMode
    ? (label: string, value: string | Date | boolean | undefined) => {
        if (label === 'date' && value instanceof Date) {
          setPageDate(value);
        }
        if (label === 'startTime' && typeof value === 'string') {
          dispatch({
            type: 'UPDATE_BOOKING_INFO',
            payload: { startTime: value }
          });
        }
      }
    : handleFilterChange;

  const slotLoading = isBusySlotsLoading || isDetailLoading;
  const slotError = false;

  const bookingContent = (
    <div className='flex h-full flex-col'>
      <BookingCalendar
        bookingState={effectiveBookingState}
        handleFilterChange={effectiveHandleFilterChange}
        resetData={resetData}
        listAvailableDate={listAvailableDate}
        availableTime={effectiveAvailableTime}
        today={today}
        hideHeader={isPageMode}
        parentOnMonthChange={handleMonthChange}
      />
      <TimeSlotsSection
        bookingState={effectiveBookingState}
        isLoading={slotLoading}
        isError={slotError}
        slotPills={slotPills}
        scheduleId={effectiveScheduleId}
        handleFilterChange={effectiveHandleFilterChange}
        setSelectedSlotId={setSelectedSlotId}
      />
      <BookingFormSection
        bookingForm={bookingForm}
        bookingState={effectiveBookingState}
        errorForm={errorForm}
        handleBookingInformationChange={handleBookingInformationChange}
        handleSubmitForm={() => {
          handleSubmitForm().catch(() => {
            // Errors handled by API interceptor
          });
        }}
        scheduleId={effectiveScheduleId}
        hideCta={isPageMode}
        isCreateAppointmentLoading={isCreateAppointmentLoading}
        isPaying={isPaying}
        isAuthenticated={isAuthenticated}
        isPending={isPending}
        practitionerRole={effectiveRole ?? ({} as PractitionerRole)}
        selectedSlotId={isPageMode ? null : selectedSlotId}
        scheduleById={scheduleById}
        router={router}
        saveIntent={saveIntent}
        startTransition={startTransition}
        setIsOpen={setIsOpen}
        practitionerGivenName={practitionerGivenName}
      />
    </div>
  );

  if (isPageMode) {
    return (
      <>
        <div className='flex flex-col px-1 pb-24'>{bookingContent}</div>
        <PaymentDrawer
          paymentOpen={paymentOpen}
          setPaymentOpen={setPaymentOpen}
          practitionerAvatar={practitionerAvatar}
          practitionerOrganizationName={practitionerOrganizationName}
          practitionerName={practitionerName}
          healthcareServiceName={
            propHealthcareServiceName ??
            healthcareServiceNames[0] ??
            'Consultation'
          }
          bookingState={effectiveBookingState}
          invoice={relayInvoice ?? invoice}
          isPaying={isPaying}
          patientId={patientId ?? ''}
          selectedSlotId={selectedSlotId}
          bookingForm={bookingForm}
          practitionerRole={effectiveRole ?? ({} as PractitionerRole)}
          healthcareServiceId={propHealthcareServiceId ?? ''}
          payAppointment={payAppointment}
          queryClient={queryClient}
          handleFilterChange={effectiveHandleFilterChange}
          setIsOpen={setIsOpen}
        />
      </>
    );
  }

  return (
    <>
      <AppDrawer
        open={isOpen}
        onClose={() => setIsOpen(false)}
        trigger={
          <button
            type='button'
            onClick={() => setIsOpen(true)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
              }
            }}
            className='w-full cursor-pointer appearance-none border-none bg-transparent p-0 text-left'
          >
            {children}
          </button>
        }
      >
        <div className='scrollbar-hide mt-4 h-full overflow-y-auto px-1'>
          {bookingContent}
        </div>
      </AppDrawer>

      <PaymentDrawer
        paymentOpen={paymentOpen}
        setPaymentOpen={setPaymentOpen}
        practitionerAvatar={practitionerAvatar}
        practitionerOrganizationName={practitionerOrganizationName}
        practitionerName={practitionerName}
        healthcareServiceName={healthcareServiceNames[0] ?? 'Consultation'}
        bookingState={bookingState}
        invoice={invoice}
        isPaying={isPaying}
        patientId={patientId ?? ''}
        selectedSlotId={selectedSlotId}
        bookingForm={bookingForm}
        practitionerRole={practitionerRole}
        healthcareServiceId={propHealthcareServiceId ?? ''}
        payAppointment={payAppointment}
        queryClient={queryClient}
        handleFilterChange={handleFilterChange}
        setIsOpen={setIsOpen}
      />
    </>
  );
}
