import { getUtcDayRange } from '@/utils/helper';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  Bundle,
  BundleEntry,
  HealthcareService,
  Location,
  PractitionerRole
} from 'fhir/r4';
import { getAPI } from './api';

/** Fetch practitioner availability for a given date range. */
export const useFindAvailability = ({
  practitionerRoleId,
  dateReference,
  startFrom,
  startTo,
  dayKey
}: {
  practitionerRoleId: string;
  dateReference?: string | Date | null;
  startFrom?: string; // ISO string boundary with offset, e.g., 2025-10-13T00:00:00+07:00
  startTo?: string; // ISO string boundary with offset, e.g., 2025-10-13T23:59:59+07:00
  dayKey?: string; // cache scoping key for day-level caching (e.g., YYYY-MM-DD+offset)
}) => {
  const computed = dateReference
    ? getUtcDayRange(new Date(dateReference))
    : null;
  const utcStart = computed?.utcStart;
  const utcEnd = computed?.utcEnd;

  const ge = startFrom || utcStart;
  const le = startTo || utcEnd;

  return useQuery({
    queryKey: [
      'find-availability',
      practitionerRoleId,
      dayKey || dateReference || ge
    ],
    queryFn: async () => {
      const API = await getAPI();
      // Encode datetimes so '+' in timezone is not interpreted as space
      const geParam = encodeURIComponent(ge);
      const leParam = encodeURIComponent(le);
      const response = await API.get<Bundle>(
        `/fhir/Slot?schedule.actor=PractitionerRole/${practitionerRoleId}&start=ge${geParam}&start=le${leParam}&_include=Slot:schedule`
      );
      return response;
    },
    select: response => response.data.entry ?? null,
    enabled: Boolean(practitionerRoleId) && Boolean(ge) && Boolean(le),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

/** Mutation hook to update practitioner role info via PATCH. */
export const useUpdatePractitionerInfo = () => {
  return useMutation({
    mutationKey: ['update-practitioner-role'],
    mutationFn: async (payload: PractitionerRole) => {
      const API = await getAPI();
      try {
        const response = await API.put(
          `/fhir/PractitionerRole/${payload.id}`,
          payload
        );
        return response.data; // eslint-disable-line @typescript-eslint/no-unsafe-return
      } catch (error) {
        console.error('Error when updating practitioner information :', error);
        throw error;
      }
    }
  });
};

/**
 * Return type for useGetPractitionerRoleWorkingLocations.
 */
export type PractitionerWorkingLocationData = {
  practitionerRole: PractitionerRole;
  location?: Location;
  healthcareServices: HealthcareService[];
};

/**
 * Fetch practitioner's own roles with Location and HealthcareService includes.
 *
 * Used by the practitioner listing page to display working location cards
 * with proper location names and healthcare service descriptions.
 *
 * Query:
 *   /fhir/PractitionerRole?practitioner={id}
 *   &_include=PractitionerRole:location
 *   &_include=PractitionerRole:service
 *
 * @param practitionerId - FHIR Practitioner ID
 * @returns Query result with PractitionerWorkingLocationData[]
 */
export function useGetPractitionerRoleWorkingLocations(practitionerId: string) {
  return useQuery({
    queryKey: ['practitioner-working-locations', practitionerId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/PractitionerRole?practitioner=${practitionerId}&_include=PractitionerRole:location&_include=PractitionerRole:service`
      );
      return response;
    },
    select: response => {
      const entries = response.data.entry ?? [];

      const practitionerRoles = entries.filter(
        (e: BundleEntry) => e.resource?.resourceType === 'PractitionerRole'
      ) as BundleEntry<PractitionerRole>[];

      const locations = entries.filter(
        (e: BundleEntry) => e.resource?.resourceType === 'Location'
      ) as BundleEntry<Location>[];

      const healthcareServices = entries.filter(
        (e: BundleEntry) => e.resource?.resourceType === 'HealthcareService'
      ) as BundleEntry<HealthcareService>[];

      return practitionerRoles.map((role): PractitionerWorkingLocationData => {
        const locationRef =
          role.resource.location?.[0]?.reference?.split('/')[1];
        const location = locations.find(
          l => l.resource.id === locationRef
        )?.resource;

        const hsRefs =
          role.resource.healthcareService?.map(
            h => h.reference?.split('/')[1]
          ) ?? [];
        const services = healthcareServices
          .filter(hs => hs.resource.id && hsRefs.includes(hs.resource.id))
          .map(hs => hs.resource);

        return {
          practitionerRole: role.resource,
          location,
          healthcareServices: services
        };
      });
    },
    enabled: Boolean(practitionerId)
  });
}

export {
  computeFreeSlots,
  useBusySlotsByPractitioner,
  usePractitionerSlots
} from './slots';
