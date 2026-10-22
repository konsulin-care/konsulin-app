import { format } from 'date-fns';
import type { Appointment, Bundle, BundleEntry } from 'fhir/r4';

/** Date and location reference extracted from an Appointment. */
export interface AppointmentLocation {
  date: string | null;
  locationRef: string | undefined;
}

/**
 * Extract all resources of a given type from a FHIR Bundle.
 *
 * @param bundle - The FHIR Bundle to search.
 * @param resourceType - The resource type to extract.
 * @returns Array of matching resources.
 */
export function extractResources<T extends { resourceType: string }>(
  bundle: Bundle | undefined,
  resourceType: string
): T[] {
  return (
    (bundle?.entry ?? [])
      .filter(
        (e): e is BundleEntry & { resource: T } =>
          e.resource?.resourceType === resourceType
      )
      .map(e => e.resource) ?? []
  );
}

/**
 * Extract date and location reference from each appointment in the bundle.
 *
 * @param bundle - The FHIR Bundle containing Appointment resources.
 * @returns Array of AppointmentLocation objects.
 */
export function extractAppointmentLocations(
  bundle: Bundle | undefined
): AppointmentLocation[] {
  return extractResources<Appointment>(bundle, 'Appointment').map(a => ({
    date: a.start ? format(new Date(a.start), 'yyyy-MM-dd') : null,
    locationRef: (a.participant ?? []).find(
      (p: Appointment['participant'][number]) =>
        p.actor?.reference?.startsWith('Location/')
    )?.actor?.reference
  }));
}
