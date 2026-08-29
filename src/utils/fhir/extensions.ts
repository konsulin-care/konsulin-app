import type { Extension } from 'fhir/r4';

/**
 * Canonical URLs for Konsulin's custom FHIR extension definitions.
 *
 * Single source of truth for every extension URL. Consumers must import
 * from this map instead of hardcoding URL literals.
 *
 * Note: the http:// scheme is intentional — these canonical URLs are
 * identifier locators, never fetched. SonarQube S5332 is a false positive,
 * suppressed inline with //NOSONAR.
 */
export const FhirExtensionUrls = {
  fee: 'http://konsulin.care/fhir/StructureDefinition/fee', //NOSONAR
  serviceDuration:
    'http://konsulin.care/fhir/StructureDefinition/serviceDuration', //NOSONAR
  questionnaireEstimatedDuration:
    'http://konsulin.care/fhir/StructureDefinition/questionnaireEstimatedDuration', //NOSONAR
  locationImage: 'http://konsulin.care/fhir/StructureDefinition/locationImage', //NOSONAR
  questionnaireImage:
    'http://konsulin.care/fhir/StructureDefinition/questionnaireImage', //NOSONAR
  referralBatch: 'http://konsulin.care/fhir/StructureDefinition/referralBatch' //NOSONAR
} as const;

/**
 * Canonical URLs for FHIR code systems and terminologies used across
 * Konsulin resources. Consumers must import from this map instead of
 * hardcoding system URL literals.
 *
 * Note: the http:// scheme is intentional — these canonical URLs are
 * identifier locators, never fetched. SonarQube S5332 is a false positive,
 * suppressed inline with //NOSONAR.
 */
export const FhirSystems = {
  assessmentDomain: 'http://konsulin.care/fhir/CodeSystem/assessment-domain', //NOSONAR
  assessmentContext:
    'http://blaze.konsulin.care/fhir/CodeSystem/assessment-context', //NOSONAR
  usageContext: 'http://terminology.hl7.org/CodeSystem/usage-context', //NOSONAR
  lucide: 'https://lucide.dev/icons',
  ucum: 'https://unitsofmeasure.org',
  nuccTaxonomy: 'http://nucc.org/taxonomy', //NOSONAR
  practitionerRole: 'http://terminology.hl7.org/CodeSystem/practitioner-role', //NOSONAR
  snomedSct: 'http://snomed.info/sct', //NOSONAR
  researchReferral: 'http://konsulin.care/fhir/CodeSystem/research-referral' //NOSONAR
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
