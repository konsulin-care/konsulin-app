import type { Extension } from 'fhir/r4';

/**
 * Canonical URLs for Konsulin's custom FHIR extension definitions.
 *
 * Single source of truth for every extension URL. Consumers must import
 * from this map instead of hardcoding URL literals.
 */
export const FhirExtensionUrls = {
  /* eslint-disable unicorn/prefer-https */
  fee: 'http://konsulin.care/fhir/StructureDefinition/fee',
  serviceDuration:
    'http://konsulin.care/fhir/StructureDefinition/serviceDuration',
  questionnaireEstimatedDuration:
    'http://konsulin.care/fhir/StructureDefinition/questionnaireEstimatedDuration',
  locationImage: 'http://konsulin.care/fhir/StructureDefinition/locationImage',
  questionnaireImage:
    'http://konsulin.care/fhir/StructureDefinition/questionnaireImage'
  /* eslint-enable unicorn/prefer-https */
} as const;

/**
 * Canonical URLs for FHIR code systems and terminologies used across
 * Konsulin resources. Consumers must import from this map instead of
 * hardcoding system URL literals.
 */
export const FhirSystems = {
  /* eslint-disable unicorn/prefer-https */
  assessmentDomain: 'http://konsulin.care/fhir/CodeSystem/assessment-domain',
  assessmentContext:
    'http://blaze.konsulin.care/fhir/CodeSystem/assessment-context',
  usageContext: 'http://terminology.hl7.org/CodeSystem/usage-context',
  lucide: 'https://lucide.dev/icons',
  ucum: 'https://unitsofmeasure.org'
  /* eslint-enable unicorn/prefer-https */
} as const;

type WithExtension = { extension?: Extension[] };

/**
 * Add or replace an extension on a resource's extension array.
 *
 * Replaces any existing extension with the same URL and preserves all
 * unrelated extensions. Returns a new resource; the input is not mutated.
 *
 * @param resource - FHIR resource with an optional extension array
 * @param extension - The extension to upsert
 * @returns A new resource with the extension upserted
 */
export function upsertExtension<T extends WithExtension>(
  resource: T,
  extension: Extension
): T {
  const others = resource.extension?.filter(e => e.url !== extension.url) ?? [];
  return { ...resource, extension: [...others, extension] };
}

/**
 * Find an extension by URL on a resource.
 *
 * @param resource - FHIR resource with an optional extension array
 * @param url - The extension URL to look up
 * @returns The matching extension, or undefined when absent
 */
export function getExtension(
  resource: WithExtension,
  url: string
): Extension | undefined {
  return resource.extension?.find(e => e.url === url);
}
