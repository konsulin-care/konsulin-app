import { PractitionerInfo } from '@/components/practitioner/practitioner-info';
import AppDrawer from '@/components/ui/app-drawer';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

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
  bookingState
}: Readonly<Props>) {
  const router = useRouter();

  /** Navigates to the schedule page and closes the drawer. */
  const handleViewSchedule = () => {
    router.replace('/schedule');
    setPendingOpen(false);
  };

  const serviceNames = healthcareServiceName ?? 'Consultation';
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
      <div className='flex flex-col gap-4'>
        <PractitionerInfo
          practitionerAvatar={practitionerAvatar}
          practitionerOrganizationName={practitionerOrganizationName}
          practitionerName={practitionerName}
        />

        <div className='flex w-full items-center justify-center rounded-[14px] border border-[#E3E3E3] p-2'>
          <span className='text-[12px] text-[#2C2F35]'>
            {serviceNames} &bull; {dateFormatted} &bull; {timeFormatted}
          </span>
        </div>
      </div>
    </AppDrawer>
  );
}
