import { extractQuestionnaireId } from '@/utils/fhir/research';
import { getResearchTarget } from '@/utils/fhir/research-target';
import { format } from 'date-fns';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { z } from 'zod';
import { schema } from '../register/research-form';
import {
  metadataFromStudy,
  studyMetadataShape
} from '../study-metadata-schema';

/** Edit schema: the shared study fields plus the full metadata shape. */
export const editSchema = schema.extend(studyMetadataShape.shape);

/** Form values of the edit research form. */
export type FormData = z.infer<typeof schema>;

/**
 * Extract the last path segment from a FHIR reference string.
 * @param ref - FHIR reference such as `PlanDefinition/plan-1`
 * @returns the id, or null when the reference is missing
 */
export function extractIdFromReference(ref?: string): string | null {
  if (!ref) return null;
  const parts = ref.split('/').filter(Boolean);
  return parts.at(-1) ?? null;
}

/**
 * Convert a ResearchStudy into form-ready defaults, including metadata.
 * @param study - the stored ResearchStudy
 * @param planDefinitions - the study PlanDefinitions in protocol order
 * @returns default values for the edit form
 */
export function mapToFormData(
  study: ResearchStudy,
  planDefinitions: PlanDefinition[]
): FormData {
  const metadata = metadataFromStudy(study);
  return {
    title: study.title ?? '',
    description: study.description ?? '',
    targetParticipants: getResearchTarget(study) ?? undefined,
    researchQuestion: metadata.researchQuestion,
    whoCanJoin: metadata.whoCanJoin,
    ethicsStatus: metadata.ethicsStatus,
    ethicsReference: metadata.ethicsReference,
    sharesFindings: metadata.sharesFindings ?? false,
    batches: planDefinitions
      .toSorted((a, b) =>
        (a.effectivePeriod?.start ?? '').localeCompare(
          b.effectivePeriod?.start ?? ''
        )
      )
      .map(plan => ({
        startDate: plan.effectivePeriod?.start ?? '',
        endDate: plan.effectivePeriod?.end ?? '',
        questionnaireIds: (plan.action ?? [])
          .map(a => extractQuestionnaireId(a.definitionCanonical))
          .filter((id): id is string => id !== null)
      }))
  };
}

/**
 * Map study protocol references to matching plan definition IDs.
 * @param study - the stored ResearchStudy
 * @param planDefinitions - the study PlanDefinitions
 * @returns plan definition ids present in both the study and the loaded plans
 */
export function mapToPlanIds(
  study: ResearchStudy,
  planDefinitions: PlanDefinition[]
): string[] {
  const planIdMap = new Map(planDefinitions.map(p => [p.id, p.id]));
  return (study.protocol ?? [])
    .map(ref => extractIdFromReference(ref.reference))
    .filter((id): id is string => id !== null && planIdMap.has(id));
}

/**
 * Return indices of batches whose start date is in the past.
 * @param batches - the form batches
 * @returns indices of locked batches
 */
export function computeLockedBatchIndices(
  batches: FormData['batches']
): number[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  return batches
    .map((batch, i) => ({ batch, i }))
    .filter(
      ({ batch }) =>
        batch.endDate < today ||
        (batch.startDate <= today && batch.endDate >= today)
    )
    .map(({ i }) => i);
}
