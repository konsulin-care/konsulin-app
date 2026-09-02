import type { IStateBooking } from '@/context/booking/bookingTypes';
import type { QueryClient } from '@tanstack/react-query';
import type { Invoice, PractitionerRole } from 'fhir/r4';
import PaymentDrawer, {
  type PayAppointmentFn,
  type PractitionerAvatar
} from './payment-drawer';
import PaymentPendingDrawer from './payment-pending-drawer';

/** Props for the shared payment and payment-pending drawers. */
type PaymentDrawersProps = {
  /** Whether the payment drawer is open. */
  paymentOpen: boolean;
  setPaymentOpen: (open: boolean) => void;
  setPaymentPendingOpen: (open: boolean) => void;
  practitionerAvatar?: PractitionerAvatar;
  practitionerOrganizationName?: string;
  practitionerName?: string;
  /** Resolved healthcare service name (no fallbacks needed). */
  healthcareServiceName: string;
  /** Resolved booking state for the active mode. */
  bookingState: IStateBooking;
  /** Resolved invoice — relay invoice or passthrough. */
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
  /** Whether the payment-pending drawer is open. */
  pendingOpen: boolean;
  setPendingOpen: (open: boolean) => void;
};

/** Shared payment and payment-pending drawers. Resolved props only — no mode logic. */
export default function PaymentDrawers({
  // PaymentDrawer props
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
  setIsOpen,
  // PaymentPendingDrawer props
  pendingOpen,
  setPendingOpen
}: Readonly<PaymentDrawersProps>) {
  return (
    <>
      <PaymentDrawer
        paymentOpen={paymentOpen}
        setPaymentOpen={setPaymentOpen}
        setPaymentPendingOpen={setPaymentPendingOpen}
        practitionerAvatar={practitionerAvatar}
        practitionerOrganizationName={practitionerOrganizationName}
        practitionerName={practitionerName}
        healthcareServiceName={healthcareServiceName}
        bookingState={bookingState}
        invoice={invoice}
        isPaying={isPaying}
        patientId={patientId}
        selectedSlotId={selectedSlotId}
        appointmentId={appointmentId}
        bookingForm={bookingForm}
        practitionerRole={practitionerRole}
        healthcareServiceId={healthcareServiceId}
        payAppointment={payAppointment}
        queryClient={queryClient}
        handleFilterChange={handleFilterChange}
        setIsOpen={setIsOpen}
      />
      <PaymentPendingDrawer
        pendingOpen={pendingOpen}
        setPendingOpen={setPendingOpen}
        practitionerAvatar={practitionerAvatar}
        practitionerOrganizationName={practitionerOrganizationName}
        practitionerName={practitionerName}
        healthcareServiceName={healthcareServiceName}
        bookingState={bookingState}
        invoice={invoice}
      />
    </>
  );
}
