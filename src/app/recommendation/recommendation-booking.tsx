'use client';

import PractitionerAvailability from '@/app/practitioner/practitioner-availability';
import { LoadingSpinnerIcon } from '@/components/icons';
import { getAPI } from '@/services/api';
import type { Recommendation } from '@/types/recommendation';
import { useQuery } from '@tanstack/react-query';
import type { Bundle, Organization, PractitionerRole } from 'fhir/r4';
import { ReactNode } from 'react';

interface BookingRole {
  role?: PractitionerRole;
  orgName?: string;
}

/**
 * Fetch the full PractitionerRole (with organization) so the booking drawer
 * can use the real availability data of the selected recommendation card.
 *
 * @param recommendation - The selected recommendation card
 * @returns The loaded role + organization name, or null while loading
 */
function useBookingRole(recommendation: Recommendation) {
  return useQuery({
    queryKey: ['recommendation-booking', recommendation.practitionerRoleId],
    queryFn: async (): Promise<BookingRole> => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/PractitionerRole?_id=${recommendation.practitionerRoleId}&_include=PractitionerRole:organization&_include=PractitionerRole:service`
      );
      const entries = response.data.entry ?? [];
      const role = entries.find(
        e => e.resource?.resourceType === 'PractitionerRole'
      )?.resource as PractitionerRole | undefined;
      const org = entries.find(e => e.resource?.resourceType === 'Organization')
        ?.resource as Organization | undefined;
      return { role, orgName: org?.name };
    },
    enabled: Boolean(recommendation.practitionerRoleId)
  });
}

/**
 * Booking trigger for one recommendation card.
 *
 * Wraps the shared PractitionerAvailability drawer with the real role,
 * schedule, and HealthcareService from the BFF payload. Guest redirect to
 * /auth on booking is handled inside the shared availability flow.
 */
export default function RecommendationBooking({
  recommendation,
  children
}: {
  recommendation: Recommendation;
  children: ReactNode;
}) {
  const { data, isLoading, isError } = useBookingRole(recommendation);

  if (isLoading || isError || !data?.role) {
    return (
      <button
        type='button'
        disabled={isLoading}
        className='bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold disabled:opacity-60'
      >
        {isLoading ? (
          <LoadingSpinnerIcon width={16} height={16} className='animate-spin' />
        ) : (
          'Book'
        )}
      </button>
    );
  }

  return (
    <PractitionerAvailability
      variant='drawer'
      practitionerRole={data.role}
      scheduleId={recommendation.scheduleId}
      practitionerName={recommendation.practitionerName}
      practitionerOrganizationName={data.orgName ?? ''}
      healthcareServiceId={recommendation.healthcareServiceId}
      healthcareServiceName={recommendation.healthcareServiceName}
      durationMinutes={recommendation.durationMinutes}
      organizationId={data.role.organization?.reference}
    >
      {children}
    </PractitionerAvailability>
  );
}
