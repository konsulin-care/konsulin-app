import { PractitionerInfo } from '@/components/practitioner/practitioner-info';
import { formatCurrencyValue } from '@/utils/fhir/fee';
import type { Invoice } from 'fhir/r4';
import { Calendar, Clock, MapPin } from 'lucide-react';

type AppointmentSummaryProps = {
  practitionerAvatar?: {
    photoUrl?: string;
    initials?: string;
    backgroundColor?: string;
    seed?: string;
  };
  practitionerOrganizationName?: string;
  practitionerName?: string;
  /** Name of the healthcare service being booked. */
  healthcareServiceName?: string;
  dateFormatted: string;
  timeFormatted: string;
  /** Invoice — when totalNet exists, a Total row is rendered. */
  invoice?: Invoice;
};

type ServiceDetailsProps = {
  dateFormatted: string;
  timeFormatted: string;
  locationName?: string;
};

function ServiceDetails({
  dateFormatted,
  timeFormatted,
  locationName
}: Readonly<ServiceDetailsProps>) {
  return (
    <div className='flex flex-col gap-2 rounded-[14px] border border-[#E3E3E3] p-3'>
      <div className='flex items-center gap-2'>
        <Calendar size={14} className='text-[#666]' />
        <span className='text-[12px] text-[#2C2F35]'>{dateFormatted}</span>
      </div>
      <div className='flex items-center gap-2'>
        <Clock size={14} className='text-[#666]' />
        <span className='text-[12px] text-[#2C2F35]'>{timeFormatted}</span>
      </div>
      {locationName && (
        <div className='flex items-center gap-2'>
          <MapPin size={14} className='text-[#666]' />
          <span className='text-[12px] text-[#2C2F35]'>{locationName}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Shared appointment summary block used by the payment and payment-pending
 * drawers: practitioner identity, service name, date/time/location rows,
 * and the invoice Total row when available.
 */
export default function AppointmentSummary({
  practitionerAvatar,
  practitionerOrganizationName,
  practitionerName,
  healthcareServiceName,
  dateFormatted,
  timeFormatted,
  invoice
}: Readonly<AppointmentSummaryProps>) {
  const serviceNames = healthcareServiceName ?? 'Consultation';
  const formattedPrice = invoice?.totalNet
    ? formatCurrencyValue(invoice.totalNet.value, invoice.totalNet.currency)
    : '-';

  return (
    <div className='flex flex-col gap-4'>
      <PractitionerInfo
        practitionerAvatar={practitionerAvatar}
        practitionerOrganizationName={practitionerOrganizationName}
        practitionerName={practitionerName}
      />

      <div className='text-center text-[14px] font-medium text-[#2C2F35]'>
        {serviceNames}
      </div>

      <ServiceDetails
        dateFormatted={dateFormatted}
        timeFormatted={timeFormatted}
        locationName={practitionerOrganizationName}
      />

      {invoice?.totalNet && (
        <div className='mt-2 flex items-center justify-between rounded-[12px] bg-[#F9F9F9] p-3'>
          <span className='text-[12px] text-[#666]'>Total</span>
          <span className='text-[16px] font-bold'>{formattedPrice}</span>
        </div>
      )}
    </div>
  );
}
