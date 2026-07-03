/* eslint-disable max-lines, react/jsx-max-depth, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import { useFabDirty } from '@/context/fabDirtyContext';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import { STORES, dbDelete, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import {
  useCreateAppointment,
  useRelayBooking,
  usePayAppointment
} from '@/services/api/appointments';
import { useDetailPractitioner } from '@/services/clinic';
import {
  timeToMinutes,
  minutesToTimeStr,
  useBusySlotsByPractitioner,
  computeFreeSlots
} from '@/services/slots';
import { clearIntent, getIntent, saveIntent } from '@/utils/redirect-intent';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { Invoice, PractitionerRole } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import BookingCalendar from './booking-calendar';
import BookingFormSection from './booking-form-section';
import PaymentDrawer from './payment-drawer';
import TimeSlotsSection from './time-slots-section';
import {
  AppointmentPayload,
  getAvailableDays,
  isAppointmentPayload,
  matchesPractitionerFromPath
} from './utils';

type TempBookingData = {
  scheduleId: string;
  sessionType: string;
  problemBrief: string;
  practitionerRoleId: string;
  practitionerAvailableTime: string;
  date: string;
  startTime: string;
  hasUserChosenDate: boolean;
};

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
  const [bookingForm, setBookingInformation] = useState({
    session_type: 'offline',
    problem_brief: ''
  });
  const [errorForm, setErrorForm] = useState<string[] | null>(null);
  const { setDirtyState } = useFabDirty();
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const { isLoading: isCreateAppointmentLoading } = useCreateAppointment();
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const { mutateAsync: payAppointment, isLoading: isPaying } =
    usePayAppointment();
  const { mutateAsync: relayBooking } =
    useRelayBooking();
  const [relayInvoice, setRelayInvoice] = useState<Invoice | null>(null);

  const patientId = authState?.userInfo?.fhirId;
  const isAuthenticated = authState?.isAuthenticated;

  // Page mode: fetch practitioner detail internally
  const { newData: detail, isLoading: isDetailLoading } =
    useDetailPractitioner(isPageMode ? practitionerRoleId ?? '' : '');

  const practitionerId = isPageMode
    ? detail?.practitioner?.id ?? ''
    : (practitionerRole?.practitioner?.reference?.replace('Practitioner/', '') ?? '');

  // Extract practitioner's first given name for the personalized label
  const practitionerGivenName = isPageMode
    ? detail?.practitioner?.name?.[0]?.given?.[0]
    : undefined;

  // Healthcare service names for display in payment drawer
  const healthcareServiceNames = useMemo(() => {
    if (isPageMode) {
      return detail?.healthcareServices?.map(s => s.name).filter(Boolean) ?? [];
    }
    return practitionerRole?.healthcareService?.map(h => h.display).filter(Boolean) ?? [];
  }, [isPageMode, detail, practitionerRole]);

  const [pageDate, setPageDate] = useState<Date>(startOfDay(new Date()));

  // Effective practitioner role: from prop (drawer) or fetched (page)
  const effectiveRole = isPageMode
    ? detail?.resource
    : practitionerRole;

  const effectiveAvailableTime = effectiveRole?.availableTime ?? [];
  const effectiveScheduleId = isPageMode
    ? (detail?.schedule?.id ?? '')
    : (scheduleId ?? '');

  /** Update a single booking information field (problem brief, etc.). */
  const handleBookingInformationChange = (key: string, value: string) => {
    setBookingInformation(prevState => ({
      ...prevState,
      [key]: value
    }));
  };

  const listAvailableDate = getAvailableDays(
    effectiveAvailableTime,
    isPageMode ? pageDate : bookingState.date
  );

  /** Check if a given date exists in the available days array. */
  const isDateAvailable = (date: Date, availableDays: Date[]): boolean => {
    return availableDays.some(
      availableDate =>
        date.getFullYear() === availableDate.getFullYear() &&
        date.getMonth() === availableDate.getMonth() &&
        date.getDate() === availableDate.getDate()
    );
  };

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

  /** Find the next available date from the given date, incrementing day by day. */
  const getNextAvailableDate = (
    currentDate: Date,
    availableDays: Date[]
  ): Date => {
    const date = new Date(currentDate);

    if (availableDays.length === 0) {
      return date;
    }

    // Early check: if all dates in availableDays are in the past, just return the input date
    const now = new Date();
    let allInPast = true;
    for (const d of availableDays) {
      if (d >= now) {
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

  /** Reset time slot and errors, but preserve problem brief text. */
  const resetData = () => {
    handleFilterChange('startTime', null);
    setErrorForm(null);
  };

  // Derive practitioner timezone offset from PractitionerRole.period.start (e.g., +07:00)
  const practitionerTzOffset = useMemo(() => {
    const role = effectiveRole;
    if (!role) return 'Z';
    const iso = role.period?.start || role.period?.end;
    if (typeof iso === 'string') {
      const match = iso.match(/([+-]\d{2}:\d{2}|Z)$/);
      return match ? match[1] : 'Z';
    }
    return 'Z';
  }, [effectiveRole]);

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

  // Compute free slots for both modes
  const computedFreeSlots = useMemo(() => {
    if (!selectedDate || !busySlots) return [];
    return computeFreeSlots(effectiveAvailableTime, busySlots, selectedDate, durationMinutes);
  }, [selectedDate, busySlots, effectiveAvailableTime, durationMinutes]);

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

  /** Restore booking from sessionStorage (set by auth SPA after login). */
  function tryRestoreBookingFromSession(): boolean {
    const stored = sessionStorage.getItem('pending_booking');
    if (!stored) return false;
    try {
      const raw = JSON.parse(stored);
      if (!isAppointmentPayload(raw)) {
        sessionStorage.removeItem('pending_booking');
        return false;
      }
      const payload: AppointmentPayload = raw;
      if (!matchesPractitionerFromPath(payload.path, practitionerRole.id))
        return false;
      const { slot, formData } = payload;
      setBookingInformation(formData);
      handleFilterChange('date', new Date(slot.date));
      handleFilterChange('startTime', slot.startTime);
      handleFilterChange('hasUserChosenDate', true);
      if (slot.slotId) setSelectedSlotId(slot.slotId);
      setIsOpen(true);
      sessionStorage.removeItem('pending_booking');
      return true;
    } catch {
      sessionStorage.removeItem('pending_booking');
      return false;
    }
  }

  /** Try to restore booking from redirect intent. */
  function tryRestoreFromIntent(): boolean {
    const intent = getIntent();
    if (intent?.kind !== 'appointment') return false;

    if (!isAppointmentPayload(intent.payload)) {
      clearIntent();
      return false;
    }

    const payload: AppointmentPayload = intent.payload;
    if (!matchesPractitionerFromPath(payload.path, practitionerRole.id)) {
      return false;
    }

    const { slot, formData } = payload;
    setBookingInformation(formData);
    handleFilterChange('date', new Date(slot.date));
    handleFilterChange('startTime', slot.startTime);
    handleFilterChange('hasUserChosenDate', true);
    if (slot.slotId) {
      setSelectedSlotId(slot.slotId);
    }
    setIsOpen(true);
    clearIntent();
    return true;
  }

  /** Load temporary booking data from IndexedDB. */
  function loadTempBookingFromIndexedDB(userId: string): void {
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
  }

  /** Set initial date for page mode. */
  useEffect(() => {
    if (!isPageMode) return;
    const initialDate = isDateAvailable(today, listAvailableDate)
      ? today
      : getNextAvailableDate(today, listAvailableDate);
    if (!pageDate || pageDate.getTime() !== initialDate.getTime()) {
      setPageDate(initialDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPageMode]);

  /** Restore booking state from available sources when the modal opens (drawer mode only). */
  useEffect(() => {
    if (isPageMode) return;
    const userId = authState?.userInfo?.userId;
    if (isOpenParam === 'true' && !userId) return;
    if (tryRestoreFromIntent()) return;
    if (tryRestoreBookingFromSession()) return;
    if (isOpenParam === 'true' && userId) {
      loadTempBookingFromIndexedDB(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpenParam, authState?.userInfo?.userId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /** Build the relay booking payload from form state. */
  function buildRelayPayload(
    date: Date,
    startTime: string,
    endTimeStr: string
  ) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const orgId = propOrganizationId || (isPageMode ? detail?.organization?.id : '') || '';
    return {
      patientId: `Patient/${patientId ?? ''}`,
      practitionerRoleId: `PractitionerRole/${effectiveRole?.id ?? practitionerRoleId ?? ''}`,
      practitionerId: `Practitioner/${practitionerId}`,
      healthcareServiceId: `HealthcareService/${propHealthcareServiceId ?? ''}`,
      scheduleId: `Schedule/${effectiveScheduleId}`,
      organizationId: `Organization/${orgId}`,
      date: dateStr,
      startTime,
      endTime: endTimeStr,
      timezone: practitionerTzOffset,
      condition: bookingForm.problem_brief
    };
  }

  /** Validate the form, create a FHIR Slot, then open payment drawer. */
  const handleSubmitForm = async () => {
    const { date: contextDate, startTime } = bookingState;
    // Page mode stores date in pageDate local state, not bookingState context
    const date = isPageMode ? pageDate : contextDate;
    const requiredData = {
      'Problem Brief': bookingForm.problem_brief,
      'Tanggal Appointment': date,
      'Jam Appointment': startTime,
      'Tipe Session': bookingForm.session_type
    };

    const emptyField = Object.entries(requiredData).filter(item => !item[1]);

    if (emptyField.length > 0) {
      setErrorForm(emptyField.map(item => item[0]));
      return;
    }

    if (!date || !startTime || !effectiveScheduleId) {
      return;
    }

    try {
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = startMinutes + durationMinutes;
      const endTimeStr = minutesToTimeStr(endMinutes);

      const payload = buildRelayPayload(date, startTime, endTimeStr);
      const response = await relayBooking(payload);

      setSelectedSlotId(response.slotId);
      setRelayInvoice({
        resourceType: 'Invoice',
        id: response.invoiceId.replace('Invoice/', ''),
        status: 'issued',
        totalNet: response.fee
      });

      setPaymentOpen(true);
    } catch {
      // Errors handled by API interceptor
    }
  };

  // Ref keeps the latest handleSubmitForm closure for the FAB's onSave
  const handleSubmitFormRef = useRef(handleSubmitForm);
  handleSubmitFormRef.current = handleSubmitForm;

  const isFormValid =
    isPageMode &&
    Boolean(bookingState.startTime) &&
    Boolean(bookingForm.problem_brief.trim());

  // Sync FAB dirty state to show "Book Now" when form is ready in page mode
  useEffect(() => {
    if (isPageMode && isFormValid) {
      setDirtyState({
        isDirty: true,
        label: 'Book Now',
        onSave: () => handleSubmitFormRef.current(),
        isSaving: false
      });
    } else {
      setDirtyState(null);
    }

    return () => {
      setDirtyState(null);
    };
  }, [isFormValid, isPageMode, setDirtyState]);

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
        <div className='flex flex-col px-1 pb-24'>
          {bookingContent}
        </div>
        <PaymentDrawer
          paymentOpen={paymentOpen}
          setPaymentOpen={setPaymentOpen}
          practitionerAvatar={practitionerAvatar}
          practitionerOrganizationName={practitionerOrganizationName}
          practitionerName={practitionerName}
          healthcareServiceName={propHealthcareServiceName ?? healthcareServiceNames[0] ?? 'Consultation'}
          bookingState={effectiveBookingState}
          invoice={relayInvoice ?? invoice}
          isPaying={isPaying}
          patientId={patientId ?? ''}
          selectedSlotId={selectedSlotId}
          bookingForm={bookingForm}
          practitionerRole={effectiveRole ?? ({} as PractitionerRole)}
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
      <Drawer onClose={() => setIsOpen(false)} open={isOpen}>
        <DrawerTrigger asChild>
          <div onClick={() => setIsOpen(true)}>{children}</div>
        </DrawerTrigger>
        <DrawerContent
          onInteractOutside={() => setIsOpen(false)}
          className='fixed right-0 bottom-0 left-0 mx-auto flex h-[85%] max-w-screen-sm flex-col bg-white p-4'
        >
          <div className='scrollbar-hide mt-4 h-full overflow-y-auto px-1'>
            {bookingContent}
          </div>
        </DrawerContent>
      </Drawer>

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
        payAppointment={payAppointment}
        queryClient={queryClient}
        handleFilterChange={handleFilterChange}
        setIsOpen={setIsOpen}
      />
    </>
  );
}
