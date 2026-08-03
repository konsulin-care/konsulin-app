import type { Questionnaire } from 'fhir/r4';
import { FhirExtensionUrls, getExtension, upsertExtension } from './extensions';

/**
 * Extract the image URL from a Questionnaire's extension.
 *
 * Looks for an extension with url matching the questionnaire image
 * extension URL. Returns null when not found.
 *
 * @param questionnaire - The Questionnaire resource to extract the image URL from
 * @returns The image URL string, or null if not present
 */
export function getQuestionnaireImageUrl(
  questionnaire: Questionnaire
): string | null {
  const ext = getExtension(questionnaire, FhirExtensionUrls.questionnaireImage);
  return ext?.valueUrl ?? null;
}

/**
 * Set the image URL on a Questionnaire resource.
 *
 * Adds or replaces the questionnaire image extension. Preserves any
 * other existing extensions on the resource.
 *
 * @param questionnaire - The Questionnaire resource to modify
 * @param url - The image URL to set
 * @returns A new Questionnaire object with the image extension set
 */
export function setQuestionnaireImageUrl(
  questionnaire: Questionnaire,
  url: string
): Questionnaire {
  return upsertExtension(questionnaire, {
    url: FhirExtensionUrls.questionnaireImage,
    valueUrl: url
  });
}
