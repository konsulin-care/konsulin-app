import Avatar from '@/components/general/avatar';
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

/** Practitioner avatar, organization, and name in the pending drawer. */
function PractitionerInfo({
  practitionerAvatar,
  practitionerOrganizationName,
  practitionerName
}: Readonly<{
  practitionerAvatar?: Props['practitionerAvatar'];
  practitionerOrganizationName?: string;
  practitionerName?: string;
}>) {
  return (
    <div className='flex flex-col items-center'>
      <Avatar
        photoUrl={practitionerAvatar?.photoUrl}
        initials={practitionerAvatar?.initials || ''}
        backgroundColor={practitionerAvatar?.backgroundColor || '#999'}
        height={72}
        width={72}
      />
      {practitionerOrganizationName && (
        <div className='mt-2 text-[12px] font-normal'>
          {practitionerOrganizationName}
        </div>
      )}
      <div className='mt-1 text-center text-[18px] font-bold'>
        {practitionerName}
      </div>
    </div>
  );
}

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
  const dateFormatted = bookingState?.date
    ? format(bookingState.date, 'dd MMMM yyyy')
    : '-/-/-';
  const timeFormatted = bookingState?.startTime || '-:-';

  return (
    <AppDrawer
      open={pendingOpen}
      onClose={() => setPendingOpen(false)}
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
