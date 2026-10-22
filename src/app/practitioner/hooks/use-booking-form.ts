import { useBooking } from '@/context/booking/bookingContext';
import { useRelayBooking } from '@/services/api/appointments';
import { minutesToTimeStr, timeToMinutes } from '@/services/slots';
import { Invoice } from 'fhir/r4';
import { useEffect, useRef, useState } from 'react';

export interface UseBookingFormOptions {
  isPageMode: boolean;
  effectiveScheduleId: string;
  practitionerId: string;
  durationMinutes: number;
  propHealthcareServiceId: string | undefined;
  propOrganizationId: string | undefined;
  detail?: { organization?: { id?: string } };
  effectiveRole?: { id?: string };
  pageDate: Date | undefined;
  patientId: string | undefined;
  setSelectedSlotId: (id: string | null) => void;
  setPaymentOpen: (open: boolean) => void;
}

interface BookingFormState {
  session_type: string;
  problem_brief: string;
}

/** Return the browser's timezone offset as '+HH:MM' string. */
function getBrowserTzOffset(): string {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offset) / 60);
  const mins = Math.abs(offset) % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Manage booking form state, validation, and submission via relay booking.
 *
 * @returns Form state, error tracking, invoice data, and submit handler.
 */
export function useBookingForm({
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
}: UseBookingFormOptions) {
  const { state: bookingState } = useBooking();
  const { mutateAsync: relayBooking } = useRelayBooking();
  const [bookingForm, setBookingInformation] = useState<BookingFormState>({
    // NOSONAR: already destructured value+setter pair; over-eager finding
    session_type: 'offline',
    problem_brief: ''
  });
  const [errorForm, setErrorForm] = useState<string[] | null>(null);
  const [relayInvoice, setRelayInvoice] = useState<Invoice | null>(null);
  const [relayAppointmentId, setRelayAppointmentId] = useState<string | null>(
    null
  );

  /** Update a single booking information field (problem brief, etc.). */
  const handleBookingInformationChange = (key: string, value: string) => {
    setBookingInformation(prevState => ({
      ...prevState,
      [key]: value
    }));
  };

  /** Build the relay booking payload from form state. */
  function buildRelayPayload(
    date: Date,
    startTime: string,
    endTimeStr: string
  ) {
    const dateStr = formatDate(date, 'yyyy-MM-dd');
    const userTzOffset = getBrowserTzOffset();
    const orgId = propOrganizationId || detail?.organization?.id || '';
    return {
      patientId: `Patient/${patientId ?? ''}`,
      practitionerRoleId: `PractitionerRole/${effectiveRole?.id ?? ''}`,
      practitionerId: `Practitioner/${practitionerId}`,
      healthcareServiceId: `HealthcareService/${propHealthcareServiceId ?? ''}`,
      scheduleId: `Schedule/${effectiveScheduleId}`,
      organizationId: `Organization/${orgId}`,
      date: dateStr,
      startTime,
      endTime: endTimeStr,
      timezone: userTzOffset,
      condition: bookingForm.problem_brief
    };
  }

  /** Validate the form, create a FHIR Slot, then open payment drawer. */
  const handleSubmitForm = async () => {
    const { date: contextDate, startTime } = bookingState;
    const date = isPageMode ? pageDate : contextDate;
    const requiredData: Record<string, unknown> = {
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

      setSelectedSlotId(response.slotId.replace('Slot/', ''));
      setRelayAppointmentId(response.appointmentId.replace('Appointment/', ''));
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

  // Clear errors when all fields are filled
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

  return {
    bookingForm,
    setBookingInformation,
    errorForm,
    setErrorForm,
    relayInvoice,
    relayAppointmentId,
    handleBookingInformationChange,
    handleSubmitForm,
    handleSubmitFormRef
  };
}

/** Minimal date formatter to avoid external dep in this hook. */
function formatDate(date: Date, pattern: string): string {
  if (pattern === 'yyyy-MM-dd') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return date.toISOString();
}
