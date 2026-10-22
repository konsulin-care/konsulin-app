'use client';

import { getProfileById } from '@/services/profile';
import { useQuery } from '@tanstack/react-query';
import { Practitioner } from 'fhir/r4';

/**
 *
 */
export function usePractitionerProfile(practitionerId: string) {
  return useQuery<Practitioner>({
    queryKey: ['profile-practitioner', practitionerId],
    queryFn: () =>
      getProfileById(practitionerId, 'Practitioner') as Promise<Practitioner>,
    enabled: Boolean(practitionerId)
  });
}
