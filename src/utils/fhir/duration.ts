import type { Questionnaire } from 'fhir/r4';
import {
  FhirExtensionUrls,
  FhirSystems,
  getExtension,
  upsertExtension
} from './extensions';

type DurationExtension = {
  url: string;
  valueDuration?: { value?: number };
  valueInteger?: number;
};

/**
 * Extract duration in minutes from a FHIR resource's extension.
 *
 * Searches for an extension matching the given URL.
 * Returns valueDuration.value if present, otherwise valueInteger,
 * or null if neither is found.
 *
 * @param resource - FHIR resource with optional extension array
 * @param extensionUrl - URL identifying the duration extension to look up
 * @returns Duration in minutes, or null if not present
 */
export function getDurationInMinutes(
  resource: { extension?: DurationExtension[] },
  extensionUrl: string
): number | null {
  const ext = getExtension(resource, extensionUrl);
  if (ext?.valueDuration?.value != null) return ext.valueDuration.value;
  if (ext?.valueInteger != null) return ext.valueInteger;
  return null;
}

/**
 * Set or replace a duration extension on a resource's extension array.
 *
 * Preserves any existing extensions that don't match the given URL.
 *
 * @param existingExtensions - Current extension array (may be undefined)
 * @param extensionUrl - URL for the duration extension
 * @param minutes - Duration in minutes
 * @returns New extension array with the duration set
 */
export function setDurationExtension(
  existingExtensions: DurationExtension[] | undefined,
  extensionUrl: string,
  minutes: number
): DurationExtension[] {
  const resource = upsertExtension(
    { extension: existingExtensions },
    {
      url: extensionUrl,
      valueDuration: { value: minutes }
    }
  );
  return resource.extension ?? [];
}

/**
 * Set the estimated duration on a Questionnaire resource.
 *
 * Replaces any existing questionnaireEstimatedDuration extension with a
 * valueDuration carrying the UCUM minutes unit. Preserves all other
 * extensions on the resource.
 *
 * @param questionnaire - The Questionnaire resource to modify
 * @param minutes - Estimated duration in minutes
 * @returns A new Questionnaire object with the duration extension set
 */
export function setQuestionnaireDuration(
  questionnaire: Questionnaire,
  minutes: number
): Questionnaire {
  return upsertExtension(questionnaire, {
    url: FhirExtensionUrls.questionnaireEstimatedDuration,
    valueDuration: {
      value: minutes,
      system: FhirSystems.ucum,
      code: 'min'
    }
  });
}
