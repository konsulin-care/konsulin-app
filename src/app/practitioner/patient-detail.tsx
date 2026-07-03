'use client';

/* eslint-disable @typescript-eslint/no-unsafe-assignment -- FHIR Address contains any-typed extension */

import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { useDetailPractitioner } from '@/services/clinic';
import { generateAvatarSvgDataUrl } from '@/utils/gradientAvatar';
import { generateAvatarPlaceholder } from '@/utils/helper';
import ServiceCard from '@/components/practitioner/service-card';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useMemo } from 'react';
import type { HealthcareService } from 'fhir/r4';

type Props = {
  readonly practitionerRoleId: string;
};

/**
 * Format an address as a single-line string.
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

/** Practitioner identity section with avatar, name, and specialty badges. */
function PractitionerIdentity({
  practitionerId,
  name,
  specialties
}: {
  practitionerId: string;
  name: string;
  specialties: string[];
}) {
  const maxVisibleBadges = 3;
  const overflowCount =
    specialties.length > maxVisibleBadges
      ? specialties.length - maxVisibleBadges
      : 0;
  const visibleBadges =
    overflowCount > 0
      ? specialties.slice(0, maxVisibleBadges)
      : specialties;

  const { initials, seed } = useMemo(
    () => generateAvatarPlaceholder({ id: practitionerId, name }),
    [practitionerId, name]
  );

  const gradientUrl = useMemo(
    () => (seed ? generateAvatarSvgDataUrl(seed, initials ?? '') : null),
    [seed, initials]
  );

  return (
    <div className='flex items-center gap-3'>
      <div className='h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#13c2c2]'>
        {gradientUrl ? (
          <Image
            src={gradientUrl}
            alt={name}
            width={48}
            height={48}
            className='object-cover'
            unoptimized
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center text-sm font-bold text-white'>
            {initials}
          </div>
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <h1 className='text-xl font-bold text-black'>{name}</h1>
        {specialties.length > 0 && (
          <div className='mt-1 flex flex-wrap items-center gap-1'>
            {visibleBadges.map(s => (
              <Badge
                key={s}
                className='bg-[#E1E1E1] px-2 py-[2px] text-[11px] font-normal text-black'
              >
                {s}
              </Badge>
            ))}
            {overflowCount > 0 && (
              <span className='text-[11px] text-gray-500'>
                ({overflowCount}+)
              </span>
            )}
          </div>
        )}
      </div>
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
  services,
  practitionerRoleId,
  onNavigate
}: {
  services: HealthcareService[];
  practitionerRoleId: string;
  onNavigate: (url: string) => void;
}) {
  const activeServices = useMemo(
    () => services.filter((svc: HealthcareService) => svc.active !== false),
    [services]
  );

  return (
    <div>
      <div className='mb-2 text-sm font-bold text-black'>
        Healthcare Services
      </div>
      {activeServices.length > 0 ? (
        <div className='flex flex-col gap-2'>
          {activeServices.map((svc: HealthcareService) => (
            <ServiceCard
              key={svc.id}
              service={svc}
              onClick={() =>
                onNavigate(
                  `/practitioner/availability?id=${practitionerRoleId}&service=${svc.id}`
                )
              }
            />
          ))}
        </div>
      ) : (
        <div className='text-sm text-gray-500'>No services listed</div>
      )}
    </div>
  );
}

/**
 * Extract practitioner name from detail:
 * 1. Prefer included Practitioner resource name[0].text
 * 2. Construct from name[0].given + family
 * 3. Use PractitionerRole's practitioner.display
 * 4. Fallback to 'Practitioner'
 */
function getPractitionerName(
  detail: import('@/services/clinic').DetailPractitionerData
): string {
  const name = detail.practitioner?.name?.[0];
  if (name?.text) return name.text;
  if (name?.given?.length || name?.family) {
    return [...(name.given ?? []), name.family].filter(Boolean).join(' ');
  }
  return detail.resource.practitioner?.display ?? 'Practitioner';
}

/**
 * Patient-facing practitioner detail page.
 *
 * Shows avatar, name, specialty badges, full clinic location (name + address),
 * and healthcare service cards with fees, duration, and booking navigation.
 */
export default function PatientDetail({ practitionerRoleId }: Props) {
  const { newData: detail, isLoading } =
    useDetailPractitioner(practitionerRoleId);
  const router = useRouter();

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

  return (
    <PatientDetailBody
      detail={detail}
      practitionerRoleId={practitionerRoleId}
      router={router}
    />
  );
}

/** Renders the main body of the patient detail page. */
function PatientDetailBody({
  detail,
  practitionerRoleId,
  router
}: {
  detail: import('@/services/clinic').DetailPractitionerData;
  practitionerRoleId: string;
  router: AppRouterInstance;
}) {
  const services = detail.healthcareServices ?? [];
  const practitionerName = getPractitionerName(detail);
  const specialties = detail.resource.specialty?.map(s => s.text) ?? [];
  const practitionerId = detail.practitioner?.id ?? detail.resource.id ?? '';
  const displayOrg = detail.location ?? detail.organization;
  const firstAddr =
    detail.location?.address?.[0] ?? detail.organization?.address?.[0];
  const displayAddress = firstAddr;

  const handleNavigate = (url: string) => {
    router.push(url);
  };

  return (
    <div className='flex flex-col gap-4'>
      <PractitionerIdentity
        practitionerId={practitionerId}
        name={practitionerName}
        specialties={specialties}
      />
      <ClinicLocationSection
        orgOrLocation={displayOrg}
        address={displayAddress}
      />
      <HealthcareServicesSection
        services={services}
        practitionerRoleId={practitionerRoleId}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
