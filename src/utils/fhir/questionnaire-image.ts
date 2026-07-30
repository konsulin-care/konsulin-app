import type { Questionnaire } from 'fhir/r4';

const QUESTIONNAIRE_IMAGE_EXTENSION_URL =
  'https://konsulin.id/fhir/StructureDefinition/questionnaireImage';

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
  const ext = questionnaire.extension?.find(
    e => e.url === QUESTIONNAIRE_IMAGE_EXTENSION_URL
  );
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
  const otherExtensions =
    questionnaire.extension?.filter(
      e => e.url !== QUESTIONNAIRE_IMAGE_EXTENSION_URL
    ) ?? [];

  return {
    ...questionnaire,
    extension: [
      ...otherExtensions,
      {
        url: QUESTIONNAIRE_IMAGE_EXTENSION_URL,
        valueUrl: url
      }
    ]
  };
}
