/* eslint-disable max-lines, complexity */
import AppDrawer from '@/components/ui/app-drawer';
import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import { useFab } from '@/context/fabContext';
import { getAPI } from '@/services/api';
import {
  useCreateAppointment,
  usePayAppointment
} from '@/services/api/appointments';
import { computeFreeSlots, useBusySlotsByPractitioner } from '@/services/slots';
import { saveIntent } from '@/utils/redirect-intent';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay } from 'date-fns';
import { Invoice, PractitionerRole, Schedule } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useMemo, useState, useTransition } from 'react';
import BookingCalendar from './booking-calendar';
import BookingFormSection from './booking-form-section';
import { useBookingForm } from './hooks/use-booking-form';
import { useBookingRestoration } from './hooks/use-booking-restoration';
import { useBookingRestoreCallbacks } from './hooks/use-booking-restore-callbacks';
import { useComputedSlots } from './hooks/use-computed-slots';
import { useFabActionSync } from './hooks/use-fab-action-sync';
import { useInitialDate } from './hooks/use-initial-date';
import { useMonthChange } from './hooks/use-month-change';
import { useSlotRecovery } from './hooks/use-slot-recovery';
import { usePractitionerRole } from './hooks/usePractitionerRole';
import PaymentDrawers from './payment-drawers';
import TimeSlotsSection from './time-slots-section';
import {
  buildPractitionerAvatar,
  createPageModeFilter,
  getAvailableDays,
  resolveDrawerServiceName,
  resolvePagePaymentProps
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
    seed?: string;
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
  const [paymentPendingOpen, setPaymentPendingOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const { state: bookingState, dispatch } = useBooking();
  const { state: authState } = useAuth();
  const { dispatch: fabDispatch } = useFab();
  const queryClient = useQueryClient();
  const { isPending: isCreateAppointmentLoading } = useCreateAppointment();
  const { mutateAsync: payAppointment, isPending: isPaying } =
    usePayAppointment();

  const patientId = authState?.userInfo?.fhirId;
  const isAuthenticated = authState?.isAuthenticated === true;

  const {
    detail,
    isDetailLoading,
    practitionerId,
    practitionerGivenName,
    practitionerDisplayName,
    practitionerPhotoUrl,
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

  const effectivePractitionerName = practitionerDisplayName ?? practitionerName;

  const effectivePractitionerAvatar = buildPractitionerAvatar({
    practitionerPhotoUrl,
    practitionerDisplayName: effectivePractitionerName,
    practitionerAvatar
  });

  const {
    bookingForm,
    setBookingInformation,
    errorForm,
    relayInvoice,
    relayAppointmentId,
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

  /** Update a single field in booking state via dispatch. */
  const handleFilterChange = (
    label: string,
    value: string | Date | boolean | undefined
  ) => {
    dispatch({
      type: 'UPDATE_BOOKING_INFO',
      payload: {
        [label]: value // eslint-disable-line security/detect-object-injection -- computed key from trusted form state
      }
    });
  };

  /** Reset start time and clear any form validation error. */
  const resetData = () => {
    handleFilterChange('startTime', null);
    setErrorForm(null);
  };

  const handleMonthChange = useMonthChange({
    isPageMode,
    effectiveAvailableTime,
    today,
    setPageDate
  });

  const selectedDate = isPageMode ? pageDate : bookingState.date;

  const dateStr = useMemo(
    () => (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''),
    [selectedDate]
  );

  const {
    data: busySlots,
    isLoading: isBusySlotsLoading,
    isError: isBusySlotsError
  } = useBusySlotsByPractitioner(practitionerId, dateStr);

  const { slotPills } = useComputedSlots({
    selectedDate,
    busySlots,
    effectiveAvailableTime,
    durationMinutes,
    practitionerTzOffset,
    computeFreeSlots
  });

  const isScheduleReady = Boolean(effectiveScheduleId) && isAuthenticated;

  const { data: scheduleById } = useQuery({
    queryKey: ['schedule-by-id', effectiveScheduleId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(`/fhir/Schedule/${effectiveScheduleId}`);
      return response.data as Schedule | undefined;
    },
    enabled: isScheduleReady,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const { onRestoreAppointment, onLoadTempBooking } =
    useBookingRestoreCallbacks({
      setBookingInformation,
      handleFilterChange,
      setSelectedSlotId,
      setIsOpen
    });

  const authUserInfo = authState?.userInfo;
  const authUserId = authUserInfo?.userId;

  useBookingRestoration({
    isPageMode,
    isOpenParam,
    practitionerRoleId: practitionerRole?.id ?? '',
    authUserId,
    onRestoreAppointment,
    onLoadTempBooking
  });

  useInitialDate({
    isPageMode,
    today,
    listAvailableDate,
    isOpenParam,
    bookingDate: bookingState.date,
    hasUserChosenDate: bookingState.hasUserChosenDate,
    handleFilterChange,
    pageDate,
    setPageDate
  });

  useSlotRecovery({
    isOpenParam,
    bookingState,
    listAvailableDate,
    slotPills,
    handleFilterChange,
    router
  });

  const hasStartTime = Boolean(bookingState.startTime);
  const hasProblemBrief = Boolean(bookingForm.problem_brief.trim());
  const isFormValid = isPageMode && hasStartTime && hasProblemBrief;

  useFabActionSync({
    isPageMode,
    isFormValid,
    fabDispatch,
    handleSubmitFormRef
  });

  const effectiveBookingState = isPageMode
    ? ({
        date: pageDate,
        startTime: bookingState.startTime ?? '',
        hasUserChosenDate: false
      } as IStateBooking)
    : bookingState;

  const effectiveHandleFilterChange = createPageModeFilter({
    isPageMode,
    handleFilterChange,
    dispatch,
    setPageDate
  });

  // Resolved payment props — fallbacks resolved here, not in child components
  const pagePaymentProps = resolvePagePaymentProps({
    propHealthcareServiceName,
    healthcareServiceNames,
    relayInvoice,
    invoice,
    patientId,
    effectiveRole,
    propHealthcareServiceId
  });
  const drawerServiceName = resolveDrawerServiceName(healthcareServiceNames);

  const slotLoading = isBusySlotsLoading || isDetailLoading;

  /** Open drawer on Enter or Space key. */
  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  /** Submit the booking form, swallowing errors handled by API interceptor. */
  const handleFormSubmit = () => {
    handleSubmitForm().catch(() => {
      // Errors handled by API interceptor
    });
  };

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
        isError={isBusySlotsError}
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
        handleSubmitForm={handleFormSubmit}
        scheduleId={effectiveScheduleId}
        hideCta={isPageMode}
        isCreateAppointmentLoading={isCreateAppointmentLoading}
        isPaying={isPaying}
        isAuthenticated={isAuthenticated}
        isPending={isPending}
        practitionerRole={pagePaymentProps.practitionerRole}
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
        <PaymentDrawers
          paymentOpen={paymentOpen}
          setPaymentOpen={setPaymentOpen}
          setPaymentPendingOpen={setPaymentPendingOpen}
          practitionerAvatar={effectivePractitionerAvatar}
          practitionerOrganizationName={practitionerOrganizationName}
          practitionerName={effectivePractitionerName}
          healthcareServiceName={pagePaymentProps.healthcareServiceName}
          bookingState={effectiveBookingState}
          invoice={pagePaymentProps.invoice}
          isPaying={isPaying}
          patientId={pagePaymentProps.patientId}
          selectedSlotId={selectedSlotId}
          appointmentId={relayAppointmentId ?? ''}
          bookingForm={bookingForm}
          practitionerRole={pagePaymentProps.practitionerRole}
          healthcareServiceId={pagePaymentProps.healthcareServiceId}
          payAppointment={payAppointment}
          queryClient={queryClient}
          handleFilterChange={effectiveHandleFilterChange}
          setIsOpen={setIsOpen}
          pendingOpen={paymentPendingOpen}
          setPendingOpen={setPaymentPendingOpen}
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
            onKeyDown={handleTriggerKeyDown}
            className='w-full cursor-pointer appearance-none border-none bg-transparent p-0 text-left'
          >
            {children}
          </button>
        }
      >
        <div className='scrollbar-hide mt-4 h-full overflow-y-auto'>
          {bookingContent}
        </div>
      </AppDrawer>

      <PaymentDrawers
        paymentOpen={paymentOpen}
        setPaymentOpen={setPaymentOpen}
        setPaymentPendingOpen={setPaymentPendingOpen}
        practitionerAvatar={effectivePractitionerAvatar}
        practitionerOrganizationName={practitionerOrganizationName}
        practitionerName={effectivePractitionerName}
        healthcareServiceName={drawerServiceName}
        bookingState={bookingState}
        invoice={invoice}
        isPaying={isPaying}
        patientId={pagePaymentProps.patientId}
        selectedSlotId={selectedSlotId}
        appointmentId={relayAppointmentId ?? ''}
        bookingForm={bookingForm}
        practitionerRole={practitionerRole}
        healthcareServiceId={pagePaymentProps.healthcareServiceId}
        payAppointment={payAppointment}
        queryClient={queryClient}
        handleFilterChange={handleFilterChange}
        setIsOpen={setIsOpen}
        pendingOpen={paymentPendingOpen}
        setPendingOpen={setPaymentPendingOpen}
      />
    </>
  );
}
