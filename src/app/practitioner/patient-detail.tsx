'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { useDetailPractitioner } from '@/services/clinic';
import { getFeeFromHealthcareService } from '@/utils/fhir/fee';
import type { HealthcareService, Location, Money, Organization } from 'fhir/r4';

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

/** Practitioner name + specialty badges. */
function LocationHeader({
  name,
  specialties
}: {
  name: string;
  specialties: string[];
}) {
  return (
    <div>
      <h1 className='text-xl font-bold text-black'>{name}</h1>
      {specialties.length > 0 && (
        <div className='mt-2 flex flex-wrap gap-1'>
          {specialties.map(s => (
            <Badge key={s} className='bg-[#E1E1E1] text-[11px] text-black'>
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/** Clinic location block — renders name and address from a Location or Organization. */
function ClinicLocationSection({
  orgOrLocation,
  address
}: {
  orgOrLocation: { name?: string; address?: Array<{ line?: string[]; district?: string; city?: string; postalCode?: string }> } | undefined;
  address: { line?: string[]; district?: string; city?: string; postalCode?: string } | undefined;
}) {
  if (!orgOrLocation) return null;
  return (
    <div>
      <div className='text-sm text-gray-500'>Location</div>
      <div className='text-sm font-medium text-black'>
        {orgOrLocation.name}
      </div>
      {address && (
        <div className='mt-1 text-xs text-gray-500'>
          {formatAddress(address)}
        </div>
      )}
    </div>
  );
}

/** Healthcare service cards with fee and details. */
function HealthcareServicesSection({
  services
}: {
  services: HealthcareService[];
}) {
  return (
    <div>
      <div className='mb-2 text-sm font-bold text-black'>
        Healthcare Services
      </div>
      {services.length > 0 ? (
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
                      <div className='text-sm font-bold'>{svc.name}</div>
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
  );
}

/**
 * Patient-facing practitioner detail page.
 *
 * Shows name, specialty badges, full clinic location (name + address),
 * and healthcare service cards with fees and details.
 */
export default function PatientDetail({ practitionerRoleId }: Props) {
  const { newData: detail, isLoading } =
    useDetailPractitioner(practitionerRoleId);

  const services = detail?.healthcareServices ?? [];

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

  // Type narrowing through DetailPractitionerData is safe.
  const location: Location | undefined = detail.location;
  const organization: Organization | undefined = detail.organization;
  const displayOrg = location ?? organization;
  // Cast through safe type — FHIR Address includes any-typed extension.
  const displayAddress:
    | { line?: string[]; district?: string; city?: string; postalCode?: string }
    | undefined =
    location?.address?.[0] as
      | { line?: string[]; district?: string; city?: string; postalCode?: string }
      | undefined
    ?? (organization?.address?.[0] as
      | { line?: string[]; district?: string; city?: string; postalCode?: string }
      | undefined);

  return (
    <div className='flex flex-col gap-4'>
      <LocationHeader name={practitionerName} specialties={specialties} />
      <ClinicLocationSection
        orgOrLocation={displayOrg}
        address={displayAddress}
      />
      <HealthcareServicesSection services={services} />
    </div>
  );
}
