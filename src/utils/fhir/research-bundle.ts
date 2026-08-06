import type {
  Bundle,
  PlanDefinition,
  QuestionnaireResponse,
  ResearchStudy,
  ResearchSubject,
  Resource
} from 'fhir/r4';
import {
  computeResearchProgress,
  computeStudyProgress,
  parseCanonicalOrReference,
  toResearchBatch,
  type ResearchBatch,
  type ResearchProgress
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
 * Parses a batch-response bundle (studies + _include PlanDefinitions +
 * QuestionnaireResponses) into a typed ResearchProgress object.
 *
 * @param bundle - The batch-response bundle returned by the FHIR server.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns Aggregated research progress.
 */
export function parseResearchBundle(
  bundle: Bundle,
  today: string
): ResearchProgress {
  const resources = collectBundleResources(bundle);

  const studies = resources.filter(
    (resource): resource is ResearchStudy =>
      resource.resourceType === 'ResearchStudy'
  );
  const plans = resources.filter(
    (resource): resource is PlanDefinition =>
      resource.resourceType === 'PlanDefinition'
  );
  const responses = resources
    .filter(
      (resource): resource is QuestionnaireResponse =>
        resource.resourceType === 'QuestionnaireResponse'
    )
    .map(response => ({
      id: response.id ?? '',
      questionnaire: response.questionnaire ?? '',
      authored: response.authored
    }));

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
    return computeStudyProgress(study, batches, responses, today);
  });

  return computeResearchProgress(studyProgress, responses, consentedStudyIds);
}
