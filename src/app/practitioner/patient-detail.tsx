'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import {
  useDetailPractitioner,
  usePractitionerRoleHealthcareServices
} from '@/services/clinic';
import { getFeeFromHealthcareService } from '@/utils/fhir/fee';
import type { HealthcareService, Money } from 'fhir/r4';

type Props = {
  readonly practitionerRoleId: string;
};

/**
 * Format an Organization address as a single-line string.
 */
function formatAddress(address: {
  line?: string[];
  district?: string;
  city?: string;
  postalCode?: string;
}): string {
  const parts: string[] = [];
  if (address.line) parts.push(...address.line);
  if (address.district) parts.push(address.district);
  if (address.city) parts.push(address.city);
  if (address.postalCode) parts.push(address.postalCode);
  return parts.join(', ');
}

/**
 * Format fee as Indonesian Rupiah string.
 */
function formatFee(fee: Money): string {
  const formatted = (fee.value ?? 0).toLocaleString('id-ID');
  return `Rp ${formatted}`;
}

/**
 * Patient-facing practitioner detail page.
 *
 * Shows name, specialty badges, full clinic location (name + address),
 * and healthcare service cards with active indicator, fee, and details.
 */
export default function PatientDetail({ practitionerRoleId }: Props) {
  const { newData: detail, isLoading } =
    useDetailPractitioner(practitionerRoleId);
  const { data: services } =
    usePractitionerRoleHealthcareServices(practitionerRoleId);

  if (isLoading) {
    return (
      <div className='flex min-h-[40vh] items-center justify-center'>
        <LoadingSpinnerIcon
          width={56}
          height={56}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  if (!detail) return null;

  const practitionerName =
    detail.resource.practitioner?.display ?? 'Practitioner';
  const specialties = detail.resource.specialty?.map(s => s.text) ?? [];
  const organization = detail.organization;
  const orgAddress = organization?.address?.[0];

  return (
    <div className='flex flex-col gap-4'>
      {/* Header: name + specialties */}
      <div>
        <h1 className='text-xl font-bold text-black'>{practitionerName}</h1>
        <div className='mt-2 flex flex-wrap gap-1'>
          {specialties.map(s => (
            <Badge key={s} className='bg-[#E1E1E1] text-[11px] text-black'>
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* Clinic location */}
      {organization && (
        <div>
          <div className='text-sm text-gray-500'>Location</div>
          <div className='text-sm font-medium text-black'>
            {organization.name}
          </div>
          {orgAddress && (
            <div className='mt-1 text-xs text-gray-500'>
              {formatAddress(orgAddress)}
            </div>
          )}
        </div>
      )}

      {/* Healthcare services with fees */}
      <div>
        <div className='mb-2 text-sm font-bold text-black'>
          Healthcare Services
        </div>
        {services && services.length > 0 ? (
          <div className='flex flex-col gap-2'>
            {services
              .filter((svc: HealthcareService) => svc.active !== false)
              .map((svc: HealthcareService) => {
                const fee = getFeeFromHealthcareService(svc);
                return (
                  <div
                    key={svc.id}
                    className='rounded-lg border border-gray-200 bg-white p-4'
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <div className='text-sm font-bold'>
                          {svc.name}
                        </div>
                        {svc.extraDetails && (
                          <div className='mt-1 text-xs text-gray-500'>
                            {svc.extraDetails}
                          </div>
                        )}
                      </div>
                      {fee && (
                        <div className='shrink-0 text-sm font-bold text-[#13C2C2]'>
                          {formatFee(fee)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className='text-sm text-gray-500'>No services listed</div>
        )}
      </div>
    </div>
  );
}
