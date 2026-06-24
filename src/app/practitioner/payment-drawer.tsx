/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import Avatar from '@/components/general/avatar';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { format } from 'date-fns';
import type { ReactNode } from 'react';

type Props = {
  paymentOpen: boolean;
  setPaymentOpen: (open: boolean) => void;
  practitionerAvatar?: {
    photoUrl?: string;
    initials?: string;
    backgroundColor?: string;
  };
  practitionerOrganizationName?: string;
  practitionerName?: string;
  bookingState: any;
  invoice?: any;
  isPaying: boolean;
  patientId: string;
  selectedSlotId: string | null;
  bookingForm: { session_type: string; problem_brief: string };
  practitionerRole: any;
  payAppointment: any;
  queryClient: any;
  handleFilterChange: (label: string, value: any) => void;
  setIsOpen: (open: boolean) => void;
};

/** Practitioner avatar, organization, and name in payment drawer. */
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

/** Button content showing spinner during payment or label otherwise. */
// eslint-disable-next-line sonarjs/function-return-type
function PayButtonContent({
  isPaying,
  label
}: Readonly<{
  isPaying: boolean;
  label: string;
}>): ReactNode {
  if (isPaying) {
    return (
      <LoadingSpinnerIcon width={20} height={20} className='animate-spin' />
    );
  }

  return label;
}

/** Online payment button with loading spinner state. */
// eslint-disable-next-line sonarjs/function-return-type
function PayNowButtonContent({
  isPaying
}: Readonly<{ isPaying: boolean }>): ReactNode {
  if (isPaying) {
    return (
      <LoadingSpinnerIcon
        stroke='white'
        width={20}
        height={20}
        className='animate-spin'
      />
    );
  }

  return 'Bayar Sekarang';
}

/** Inner body of the payment drawer — invoice summary and pay buttons. */
function PaymentDrawerBody({
  practitionerAvatar,
  practitionerOrganizationName,
  practitionerName,
  dateDisplay,
  timeDisplay,
  invoice,
  isPaying,
  isPaymentDisabled,
  isPaymentDisabledOffline,
  handlePayOnline,
  handlePayOffline
}: Readonly<{
  practitionerAvatar?: Props['practitionerAvatar'];
  practitionerOrganizationName?: string;
  practitionerName?: string;
  dateDisplay: React.ReactNode;
  timeDisplay: React.ReactNode;
  invoice?: any;
  isPaying: boolean;
  isPaymentDisabled: boolean;
  isPaymentDisabledOffline: boolean;
  handlePayOnline: () => void;
  handlePayOffline: () => void;
}>) {
  return (
    <div className='flex flex-col gap-4'>
      <PractitionerInfo
        practitionerAvatar={practitionerAvatar}
        practitionerOrganizationName={practitionerOrganizationName}
        practitionerName={practitionerName}
      />

      <div className='flex w-full items-center justify-center gap-2'>
        {dateDisplay}
        {timeDisplay}
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
          disabled={isPaymentDisabled}
          onClick={handlePayOnline}
        >
          <PayNowButtonContent isPaying={isPaying} />
        </Button>
        <Button
          variant='outline'
          className='w-full rounded-xl border-0'
          disabled={isPaymentDisabledOffline}
          onClick={handlePayOffline}
        >
          <PayButtonContent isPaying={isPaying} label='Bayar Nanti' />
        </Button>
      </div>
    </div>
  );
}

/** Payment drawer with invoice summary and pay online/offline buttons. */
export default function PaymentDrawer({
  paymentOpen,
  setPaymentOpen,
  practitionerAvatar,
  practitionerOrganizationName,
  practitionerName,
  bookingState,
  invoice,
  isPaying,
  patientId,
  selectedSlotId,
  bookingForm,
  practitionerRole,
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
    !bookingForm.problem_brief?.trim();
  const isPaymentDisabledOffline = isPaymentDisabled; // same condition for both buttons

  const handlePayOnline = async () => {
    try {
      const response = await payAppointment({
        patientId: `Patient/${patientId}`,
        invoiceId: `Invoice/${invoice.id}`,
        useOnlinePayment: true,
        practitionerRoleId: `PractitionerRole/${practitionerRole.id}`,
        slotId: `Slot/${selectedSlotId}`,
        condition: bookingForm.problem_brief
      });

      if (response?.data?.paymentUrl) {
        window.open(response.data.paymentUrl, '_blank');
      }

      queryClient.invalidateQueries({
        queryKey: ['find-availability', practitionerRole.id]
      });
      handleFilterChange('isBookingSubmitted', true);
      setPaymentOpen(false);
      setIsOpen(false);
    } catch {
      // Errors toasted by interceptor
    }
  };

  /** Submit appointment payment offline (pay later). */
  const handlePayOffline = async () => {
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
    } catch {
      // Errors toasted by interceptor
    }
  };

  const dateDisplay = (
    <div className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'>
      <span className='mr-2 text-[12px] text-[#2C2F35]'>
        {bookingState?.date
          ? format(bookingState.date, 'dd MMMM yyyy')
          : '-/-/-'}
      </span>
    </div>
  );

  const timeDisplay = (
    <div className='flex w-[50%] items-center justify-between rounded-[14px] border border-[#E3E3E3] p-2'>
      <span className='mr-2 text-[12px] text-[#2C2F35]'>
        {bookingState?.startTime || '-:-'}
      </span>
    </div>
  );

  return (
    <Drawer onClose={() => setPaymentOpen(false)} open={paymentOpen}>
      <DrawerContent
        onInteractOutside={() => setPaymentOpen(false)}
        className='fixed right-0 bottom-0 left-0 mx-auto flex max-w-screen-sm flex-col bg-white p-4'
      >
        <PaymentDrawerBody
          practitionerAvatar={practitionerAvatar}
          practitionerOrganizationName={practitionerOrganizationName}
          practitionerName={practitionerName}
          dateDisplay={dateDisplay}
          timeDisplay={timeDisplay}
          invoice={invoice}
          isPaying={isPaying}
          isPaymentDisabled={isPaymentDisabled}
          isPaymentDisabledOffline={isPaymentDisabledOffline}
          handlePayOnline={() => {
            void handlePayOnline();
          }}
          handlePayOffline={() => {
            void handlePayOffline();
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}
