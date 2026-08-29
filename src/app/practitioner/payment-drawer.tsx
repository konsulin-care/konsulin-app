import AppDrawer from '@/components/ui/app-drawer';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import type { QueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { Invoice, PractitionerRole } from 'fhir/r4';
import AppointmentSummary from './appointment-summary';

type PayAppointmentPayload = {
  readonly patientId: string;
  readonly invoiceId: string;
  readonly appointmentId: string;
  readonly practitionerRoleId: string;
  readonly slotId: string;
  readonly condition: string;
  readonly healthcareServiceId: string;
};

type PayAppointmentResponse = {
  readonly data?: {
    readonly paymentUrl?: string;
  };
};

type PayAppointmentFn = (
  payload: PayAppointmentPayload
) => Promise<PayAppointmentResponse>;

type Props = {
  paymentOpen: boolean;
  setPaymentOpen: (open: boolean) => void;
  setPaymentPendingOpen: (open: boolean) => void;
  practitionerAvatar?: {
    photoUrl?: string;
    initials?: string;
    backgroundColor?: string;
  };
  practitionerOrganizationName?: string;
  practitionerName?: string;
  /** Name of the healthcare service being booked. */
  healthcareServiceName?: string;
  bookingState: IStateBooking;
  invoice?: Invoice;
  isPaying: boolean;
  patientId: string;
  selectedSlotId: string | null;
  appointmentId: string;
  bookingForm: { session_type: string; problem_brief: string };
  practitionerRole: PractitionerRole;
  healthcareServiceId?: string;
  payAppointment: PayAppointmentFn;
  queryClient: QueryClient;
  handleFilterChange: (
    label: string,
    value: string | Date | boolean | undefined
  ) => void;
  setIsOpen: (open: boolean) => void;
};

/** Payment drawer with invoice summary and a single Pay Now CTA. */
export default function PaymentDrawer({
  paymentOpen,
  setPaymentOpen,
  setPaymentPendingOpen,
  practitionerAvatar,
  practitionerOrganizationName,
  practitionerName,
  healthcareServiceName,
  bookingState,
  invoice,
  isPaying,
  patientId,
  selectedSlotId,
  appointmentId,
  bookingForm,
  practitionerRole,
  healthcareServiceId,
  payAppointment,
  queryClient,
  handleFilterChange,
  setIsOpen
}: Readonly<Props>) {
  const isPaymentDisabled =
    isPaying ||
    !patientId ||
    !invoice?.id ||
    !selectedSlotId ||
    !appointmentId ||
    !bookingForm.problem_brief?.trim();

  /** Pays for the appointment online, opens the payment URL, and shows the payment-pending drawer. */
  const handlePayOnline = async () => {
    try {
      const response = await payAppointment({
        patientId: `Patient/${patientId}`,
        invoiceId: `Invoice/${invoice.id}`,
        appointmentId: `Appointment/${appointmentId}`,
        practitionerRoleId: `PractitionerRole/${practitionerRole.id}`,
        slotId: `Slot/${selectedSlotId}`,
        condition: bookingForm.problem_brief,
        healthcareServiceId: `HealthcareService/${healthcareServiceId ?? ''}`
      });

      if (response?.data?.paymentUrl) {
        window.open(response.data.paymentUrl, '_blank');
      }

      queryClient
        .invalidateQueries({
          queryKey: ['practitioner-busy-slots']
        })
        .catch(() => {
          // Silently catch — errors handled by query client retry
        });
      handleFilterChange('isBookingSubmitted', true);
      setPaymentOpen(false);
      setIsOpen(false);
      setPaymentPendingOpen(true);
    } catch {
      // Errors toasted by interceptor
    }
  };

  const dateFormatted = bookingState?.date
    ? format(bookingState.date, 'dd MMMM yyyy')
    : '-/-/-';
  const timeFormatted = bookingState?.startTime ?? '-:-';

  return (
    <AppDrawer
      open={paymentOpen}
      onClose={() => setPaymentOpen(false)}
      ctaLabel='Pay Now'
      onCtaClick={() => {
        handlePayOnline().catch(console.error);
      }}
      ctaDisabled={isPaymentDisabled}
      ctaLoading={isPaying}
    >
      <AppointmentSummary
        practitionerAvatar={practitionerAvatar}
        practitionerOrganizationName={practitionerOrganizationName}
        practitionerName={practitionerName}
        healthcareServiceName={healthcareServiceName}
        dateFormatted={dateFormatted}
        timeFormatted={timeFormatted}
        invoice={invoice}
      />
    </AppDrawer>
  );
}
