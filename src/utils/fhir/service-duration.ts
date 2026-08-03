import type { HealthcareService } from 'fhir/r4';
import { getDurationInMinutes } from './duration';
import { FhirExtensionUrls, FhirSystems, upsertExtension } from './extensions';

/**
 * Extract the service duration in minutes from a HealthcareService's extension.
 *
 * Delegates to the shared duration utility.
 *
 * @param hs - The HealthcareService resource to extract duration from
 * @returns The duration in minutes, or null if not present
 */
export function getServiceDuration(hs: HealthcareService): number | null {
  return getDurationInMinutes(hs, FhirExtensionUrls.serviceDuration);
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
  return getDurationInMinutes(
    q,
    FhirExtensionUrls.questionnaireEstimatedDuration
  );
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
  return upsertExtension(hs, {
    url: FhirExtensionUrls.serviceDuration,
    valueDuration: {
      value: durationMinutes,
      system: FhirSystems.ucum,
      code: 'min'
    }
  });
}
