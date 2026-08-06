import type {
  Bundle,
  PlanDefinition,
  QuestionnaireResponse,
  ResearchStudy,
  ResearchSubject,
  Resource
} from 'fhir/r4';
import {
  computeStudyProgress,
  parseCanonicalOrReference,
  toResearchBatch,
  type ResearchBatch,
  type ResearchResponse,
  type StudyProgress
} from './research';

/** Recursively flattens nested bundle entries into their resources. */
function collectBundleResources(bundle: Bundle): Resource[] {
  const resources: Resource[] = [];
  /** Recursively collects resources from the bundle and its nested bundles. */
  const walk = (current: Bundle) => {
    for (const entry of current.entry ?? []) {
      const resource = entry.resource;
      if (!resource) continue;
      if (resource.resourceType === 'Bundle') {
        walk(resource);
      } else {
        resources.push(resource);
      }
    }
  };
  walk(bundle);
  return resources;
}

/**
 * Parses a studies bundle (ResearchStudy + _include PlanDefinitions +
 * ResearchSubject) into per-study progress and consented study ids.
 *
 * Handles both a flat searchset and a batch-response bundle with nested
 * searchsets, since the studies query may run alone or batched with the
 * ResearchSubject query.
 *
 * @param bundle - The bundle returned by the FHIR server.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns Per-study progress and the consented study ids.
 */
export function parseStudiesBundle(
  bundle: Bundle,
  today: string
): { studyProgress: StudyProgress[]; consentedStudyIds: string[] } {
  const resources = collectBundleResources(bundle);

  const studies = resources.filter(
    (resource): resource is ResearchStudy =>
      resource.resourceType === 'ResearchStudy'
  );
  const plans = resources.filter(
    (resource): resource is PlanDefinition =>
      resource.resourceType === 'PlanDefinition'
  );

  const consentedStudyIds = resources
    .filter(
      (resource): resource is ResearchSubject =>
        resource.resourceType === 'ResearchSubject'
    )
    .filter(subject => subject.status === 'on-study')
    .map(subject =>
      parseCanonicalOrReference(subject.study?.reference, 'ResearchStudy')
    )
    .filter((id): id is string => id !== null);

  const batchesByPlanId = new Map<string, ResearchBatch>();
  for (const plan of plans) {
    const batch = toResearchBatch(plan);
    if (batch) batchesByPlanId.set(batch.id, batch);
  }

  const studyProgress = studies.map(study => {
    const batchIds = (study.protocol ?? [])
      .map(reference =>
        parseCanonicalOrReference(reference.reference, 'PlanDefinition')
      )
      .filter((id): id is string => id !== null);
    const batches = batchIds
      .map(id => batchesByPlanId.get(id))
      .filter((batch): batch is ResearchBatch => batch !== undefined);
    return computeStudyProgress(study, batches, [], today);
  });

  return { studyProgress, consentedStudyIds };
}

/**
 * Recomputes per-study progress once the user's completed responses are
 * known. parseStudiesBundle builds the batch structure with no responses;
 * this refills the response-derived fields (completed counts, history,
 * first uncompleted questionnaire).
 *
 * @param studyProgress - Study progress with batch structure only.
 * @param responses - Completed response projections.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns Study progress with response-derived fields populated.
 */
export function recomputeStudyProgress(
  studyProgress: StudyProgress[],
  responses: ResearchResponse[],
  today: string
): StudyProgress[] {
  return studyProgress.map(entry =>
    computeStudyProgress(entry.study, entry.batches, responses, today)
  );
}

/**
 * Projects completed QuestionnaireResponses from a plain searchset bundle.
 *
 * Reads `entry[].resource` directly (no nested batch flattening) and maps
 * each QR to its minimal progress projection. Entries without a resource
 * are skipped.
 *
 * @param bundle - The searchset bundle returned by the FHIR server.
 * @returns Minimal response projections.
 */
export function parseQuestionnaireResponseSearchset(
  bundle: Bundle
): ResearchResponse[] {
  return (bundle.entry ?? [])
    .map(entry => entry.resource)
    .filter(
      (resource): resource is QuestionnaireResponse =>
        resource?.resourceType === 'QuestionnaireResponse'
    )
    .map(response => ({
      id: response.id ?? '',
      questionnaire: response.questionnaire ?? '',
      authored: response.authored
    }));
}
