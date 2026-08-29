import AppDrawer from '@/components/ui/app-drawer';
import { format } from 'date-fns';
import type { Invoice } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import AppointmentSummary from './appointment-summary';

type Props = {
  pendingOpen: boolean;
  setPendingOpen: (open: boolean) => void;
  practitionerAvatar?: {
    photoUrl?: string;
    initials?: string;
    backgroundColor?: string;
  };
  practitionerOrganizationName?: string;
  practitionerName?: string;
  /** Name of the healthcare service being booked. */
  healthcareServiceName?: string;
  bookingState: { date?: Date | null; startTime?: string | null };
  /** Invoice — shows the Total row when totalNet exists. */
  invoice?: Invoice;
};

/**
 * Drawer shown after the payment URL opens in a new tab. Informs the patient
 * that the payment is still in process and offers a CTA to the schedule page.
 */
export default function PaymentPendingDrawer({
  pendingOpen,
  setPendingOpen,
  practitionerAvatar,
  practitionerOrganizationName,
  practitionerName,
  healthcareServiceName,
  bookingState,
  invoice
}: Readonly<Props>) {
  const router = useRouter();

  /** Navigates to the schedule page and closes the drawer. */
  const handleViewSchedule = () => {
    router.replace('/schedule');
    setPendingOpen(false);
  };

  const dateFormatted = bookingState.date
    ? format(bookingState.date, 'dd MMMM yyyy')
    : '-/-/-';
  const timeFormatted = bookingState.startTime || '-:-';

  return (
    <AppDrawer
      open={pendingOpen}
      onClose={() => {
        setPendingOpen(false);
      }}
      title='Payment in process'
      description='Your payment is being processed in the opened tab. You will see this session in your schedule once it is confirmed.'
      ctaLabel='View Schedule'
      onCtaClick={handleViewSchedule}
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
