import type { HealthcareService } from 'fhir/r4';
import { DurationExtensionUrls, getDurationInMinutes } from './duration';

/**
 * Extract the service duration in minutes from a HealthcareService's extension.
 *
 * Delegates to the shared duration utility.
 *
 * @param hs - The HealthcareService resource to extract duration from
 * @returns The duration in minutes, or null if not present
 */
export function getServiceDuration(hs: HealthcareService): number | null {
  return getDurationInMinutes(hs, DurationExtensionUrls.Service);
}

/**
 * Extract the estimated duration in minutes from a Questionnaire extension.
 *
 * Delegates to the shared duration utility.
 *
 * @param q - A FHIR resource with an extension array (e.g., Questionnaire)
 * @returns The duration in minutes, or null if not present
 */
export function getQuestionnaireDuration(q: {
  extension?: Array<{
    url: string;
    valueDuration?: { value?: number };
    valueInteger?: number;
  }>;
}): number | null {
  return getDurationInMinutes(q, DurationExtensionUrls.Questionnaire);
}

/**
 * Set the service duration on a HealthcareService resource.
 *
 * Adds or replaces the service duration extension, preserving other
 * existing extensions. Uses FHIR Duration system/code for correctness.
 *
 * @param hs - The HealthcareService resource to modify
 * @param durationMinutes - Duration in minutes
 * @returns A new HealthcareService object with the duration extension set
 */
export function setServiceDuration(
  hs: HealthcareService,
  durationMinutes: number
): HealthcareService {
  const others =
    hs.extension?.filter(e => e.url !== DurationExtensionUrls.Service) ?? [];

  return {
    ...hs,
    extension: [
      ...others,
      {
        url: DurationExtensionUrls.Service,
        valueDuration: {
          value: durationMinutes,
          system: 'https://unitsofmeasure.org',
          code: 'min'
        }
      }
    ]
  };
}
