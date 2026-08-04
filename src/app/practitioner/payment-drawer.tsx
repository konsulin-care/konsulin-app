import Avatar from '@/components/general/avatar';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import { formatCurrencyValue } from '@/utils/fhir/fee';
import type { QueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { Invoice, PractitionerRole } from 'fhir/r4';
import type { ReactNode } from 'react';

type PayAppointmentPayload = {
  readonly patientId: string;
  readonly invoiceId: string;
  readonly useOnlinePayment: boolean;
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

  return 'Pay Now';
}

/** Inner body of the payment drawer — invoice summary and pay buttons. */
function PaymentDrawerBody({
  practitionerAvatar,
  practitionerOrganizationName,
  practitionerName,
  serviceInfoLine,
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
  serviceInfoLine: React.ReactNode;
  invoice?: Invoice;
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

      {serviceInfoLine}

      <div className='mt-2 flex items-center justify-between rounded-[12px] bg-[#F9F9F9] p-3'>
        <span className='text-[12px] text-[#666]'>Total</span>
        <span className='text-[16px] font-bold'>
          {invoice?.totalNet
            ? formatCurrencyValue(
                invoice.totalNet.value,
                invoice.totalNet.currency
              )
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
          <PayButtonContent isPaying={isPaying} label='Pay Later' />
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
  healthcareServiceName,
  bookingState,
  invoice,
  isPaying,
  patientId,
  selectedSlotId,
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
        condition: bookingForm.problem_brief,
        healthcareServiceId: `HealthcareService/${healthcareServiceId ?? ''}`
      });
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
    } catch {
      // Errors toasted by interceptor
    }
  };

  const serviceNames = healthcareServiceName ?? 'Consultation';
  const dateFormatted = bookingState?.date
    ? format(bookingState.date, 'dd MMMM yyyy')
    : '-/-/-';
  const timeFormatted = bookingState?.startTime || '-:-';

  const serviceInfoLine = (
    <div className='flex w-full items-center justify-center rounded-[14px] border border-[#E3E3E3] p-2'>
      <span className='text-[12px] text-[#2C2F35]'>
        {serviceNames} &bull; {dateFormatted} &bull; {timeFormatted}
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
          serviceInfoLine={serviceInfoLine}
          invoice={invoice}
          isPaying={isPaying}
          isPaymentDisabled={isPaymentDisabled}
          isPaymentDisabledOffline={isPaymentDisabledOffline}
          handlePayOnline={() => {
            handlePayOnline().catch(console.error);
          }}
          handlePayOffline={() => {
            handlePayOffline().catch(console.error);
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}
