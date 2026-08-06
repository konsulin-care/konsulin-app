import Avatar from '@/components/general/avatar';
import AppDrawer from '@/components/ui/app-drawer';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import { formatCurrencyValue } from '@/utils/fhir/fee';
import type { QueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { Invoice, PractitionerRole } from 'fhir/r4';

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

/** Payment drawer with invoice summary and a single Pay Now CTA. */
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
      </div>
    </AppDrawer>
  );
}
