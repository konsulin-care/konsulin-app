import type { ResearchStudy } from 'fhir/r4';
import { FhirExtensionUrls, getExtension, upsertExtension } from './extensions';

/**
 * Extract the participant target from a ResearchStudy's extension.
 *
 * Returns null when the research target participants extension is absent.
 *
 * @param study - The ResearchStudy resource to extract the target from
 * @returns The positive integer target, or null if not present
 */
export function getResearchTarget(study: ResearchStudy): number | null {
  const ext = getExtension(study, FhirExtensionUrls.researchTargetParticipants);
  return ext?.valuePositiveInt ?? null;
}

/**
 * Set the participant target on a ResearchStudy resource.
 *
 * Adds or replaces the research target participants extension. Preserves any
 * other existing extensions on the resource and does not mutate the input.
 *
 * @param study - The ResearchStudy resource to modify
 * @param target - The positive integer participant target to set
 * @returns A new ResearchStudy object with the target extension set
 */
export function setResearchTarget(
  study: ResearchStudy,
  target: number
): ResearchStudy {
  return upsertExtension(study, {
    url: FhirExtensionUrls.researchTargetParticipants,
    valuePositiveInt: target
  });
}
