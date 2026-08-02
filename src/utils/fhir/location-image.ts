import type { Location } from 'fhir/r4';

const LOCATION_IMAGE_EXTENSION_URL =
  // eslint-disable-next-line unicorn/prefer-https
  'http://konsulin.care/fhir/StructureDefinition/locationImage';

/**
 * Extract the image URL from a Location's extension.
 *
 * Looks for an extension with url matching the location image extension.
 * Returns null when not found.
 *
 * @param location - The Location resource to extract the image URL from
 * @returns The image URL string, or null if not present
 */
export function getLocationImageUrl(location: Location): string | null {
  const ext = location.extension?.find(
    e => e.url === LOCATION_IMAGE_EXTENSION_URL
  );
  return ext?.valueUrl ?? null;
}

/**
 * Set the image URL on a Location resource.
 *
 * Adds or replaces the location image extension. Preserves any other
 * existing extensions on the resource.
 *
 * @param location - The Location resource to modify
 * @param url - The image URL to set
 * @returns A new Location object with the image extension set
 */
export function setLocationImageUrl(location: Location, url: string): Location {
  const otherExtensions =
    location.extension?.filter(e => e.url !== LOCATION_IMAGE_EXTENSION_URL) ??
    [];

  return {
    ...location,
    extension: [
      ...otherExtensions,
      {
        url: LOCATION_IMAGE_EXTENSION_URL,
        valueUrl: url
      }
    ]
  };
}
