import type { Location } from 'fhir/r4';
import { FhirExtensionUrls, getExtension, upsertExtension } from './extensions';

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
  const ext = getExtension(location, FhirExtensionUrls.locationImage);
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
  return upsertExtension(location, {
    url: FhirExtensionUrls.locationImage,
    valueUrl: url
  });
}
