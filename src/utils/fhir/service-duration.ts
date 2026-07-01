import type { HealthcareService } from 'fhir/r4';

const DURATION_EXTENSION_URL =
  'https://konsulin.id/fhir/StructureDefinition/serviceDuration';

/**
 * Extract the service duration in minutes from a HealthcareService's extension.
 *
 * Looks for an extension with url matching the service duration extension.
 * Returns null when not found.
 *
 * @param hs - The HealthcareService resource to extract duration from
 * @returns The duration in minutes, or null if not present
 */
export function getServiceDuration(hs: HealthcareService): number | null {
  const ext = hs.extension?.find(e => e.url === DURATION_EXTENSION_URL);
  if (ext?.valueInteger == null) return null;
  return ext.valueInteger;
}

/**
 * Set the service duration on a HealthcareService resource.
 *
 * Adds or replaces the service duration extension. Preserves any other
 * existing extensions on the resource.
 *
 * @param hs - The HealthcareService resource to modify
 * @param durationMinutes - Duration in minutes
 * @returns A new HealthcareService object with the duration extension set
 */
export function setServiceDuration(
  hs: HealthcareService,
  durationMinutes: number
): HealthcareService {
  const otherExtensions =
    hs.extension?.filter(e => e.url !== DURATION_EXTENSION_URL) ?? [];

  return {
    ...hs,
    extension: [
      ...otherExtensions,
      { url: DURATION_EXTENSION_URL, valueInteger: durationMinutes }
    ]
  };
}
