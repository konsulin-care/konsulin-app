import type { IBundleResponse, IRecord } from '@/types/record';
import { questionnaireIdOf } from '@/utils/fhir/questionnaire-url';
import type { Bundle, FhirResource } from 'fhir/r4';
import { extractObservation } from './observation-extract';
import {
  extractQuestionnaireResponse,
  extractSoapQuestionnaire
} from './qr-extract';

/**
 * Collect unique FHIR resources from a nested bundle structure.
 *
 * Traverses outer Bundle entries that contain inner Bundles, deduplicating
 * by `${resourceType}/${id}`.
 *
 * @param bundle - The outer FHIR Bundle with nested inner bundles.
 * @returns Map of unique resources keyed by "ResourceType/id".
 */
export function collectUniqueResources(
  bundle: Bundle
): Map<string, FhirResource> {
  const uniqueMap = new Map<string, FhirResource>();

  if (bundle?.resourceType !== 'Bundle' || !Array.isArray(bundle?.entry))
    return uniqueMap;

  for (const outerEntry of bundle.entry) {
    const innerBundle = outerEntry.resource;

    if (
      innerBundle?.resourceType !== 'Bundle' ||
      !Array.isArray(innerBundle.entry)
    )
      continue;

    for (const innerEntry of innerBundle.entry) {
      const resource = innerEntry.resource;
      if (!resource?.resourceType || !resource.id) continue;

      const key = `${resource.resourceType}/${resource.id}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, resource);
      }
    }
  }

  return uniqueMap;
}

/**
 * Parse an array of bundle responses into sorted flat records.
 *
 * @param bundles - Array of IBundleResponse containing FHIR searchset bundles.
 * @returns Sorted IRecord array (ascending by lastUpdated).
 */
export function parseRecordBundles(bundles: IBundleResponse[]): IRecord[] {
  const results: IRecord[] = [];

  if (!Array.isArray(bundles)) return results;

  for (const bundleResponse of bundles) {
    const bundle = bundleResponse.resource;
    if (
      bundle.resourceType !== 'Bundle' ||
      (bundle.total ?? 0) <= 0 ||
      !bundle.entry
    ) {
      continue;
    }

    for (const entry of bundle.entry) {
      const resource = entry.resource;
      if (!resource?.resourceType || !resource.id) continue;

      const parsed = processBundleResource(resource);
      if (parsed) results.push(parsed as IRecord);
    }
  }

  return results.toSorted(
    (a, b) =>
      new Date(a.lastUpdated || '').getTime() -
      new Date(b.lastUpdated || '').getTime()
  );
}

/**
 * Parse a single practitioner bundle into sorted Observation/Questionnaire
 * records. Handles nested bundle structures via collectUniqueResources.
 *
 * @param bundle - The practitioner FHIR Bundle.
 * @returns Sorted IRecord array (descending by lastUpdated).
 */
export function parseRecordBundlePractitioner(bundle: Bundle): IRecord[] {
  if (bundle?.resourceType !== 'Bundle' || !Array.isArray(bundle?.entry))
    return [];

  const uniqueMap = collectUniqueResources(bundle);
  const results: Partial<IRecord>[] = [];

  for (const resource of uniqueMap.values()) {
    if (!resource?.resourceType || !resource.id) continue;

    switch (resource.resourceType) {
      case 'Observation': {
        results.push(extractObservation(resource));
        break;
      }
      case 'QuestionnaireResponse': {
        if (questionnaireIdOf(resource.questionnaire) === 'soap') {
          results.push(extractSoapQuestionnaire(resource));
        } else {
          results.push(extractQuestionnaireResponse(resource));
        }
        break;
      }
      default: {
        break;
      }
    }
  }

  return results.toSorted(
    (a, b) =>
      new Date(b.lastUpdated ?? '').getTime() -
      new Date(a.lastUpdated ?? '').getTime()
  ) as IRecord[];
}

/** Dispatch a FHIR resource to the appropriate extractor. */
function processBundleResource(
  resource: FhirResource
): Partial<IRecord> | null {
  if (resource.resourceType === 'Observation') {
    return extractObservation(resource);
  }
  if (resource.resourceType === 'QuestionnaireResponse') {
    return extractQuestionnaireResponse(resource);
  }
  return null;
}
