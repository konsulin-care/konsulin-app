/** URLs for custom FHIR duration extensions. */
export const DurationExtensionUrls = {
  // eslint-disable-next-line unicorn/prefer-https
  Service: 'http://konsulin.care/fhir/StructureDefinition/serviceDuration',
  Questionnaire:
    // eslint-disable-next-line unicorn/prefer-https
    'http://konsulin.care/fhir/StructureDefinition/questionnaireEstimatedDuration'
} as const;

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
  resource: {
    extension?: Array<{
      url: string;
      valueDuration?: { value?: number };
      valueInteger?: number;
    }>;
  },
  extensionUrl: string
): number | null {
  const ext = resource.extension?.find(e => e.url === extensionUrl);
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
  existingExtensions:
    | Array<{
        url: string;
        valueDuration?: { value?: number };
        valueInteger?: number;
      }>
    | undefined,
  extensionUrl: string,
  minutes: number
): Array<{
  url: string;
  valueDuration?: { value?: number };
  valueInteger?: number;
}> {
  const others = existingExtensions?.filter(e => e.url !== extensionUrl) ?? [];

  return [
    ...others,
    {
      url: extensionUrl,
      valueDuration: { value: minutes }
    }
  ];
}
