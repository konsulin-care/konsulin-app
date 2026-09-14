import { getAPI } from '@/services/api';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import type { FormData } from './research-form';

/**
 * Builds the FHIR transaction entry for updating a ResearchStudy.
 */
export function buildStudyEntry(
  study: ResearchStudy,
  planIds: string[],
  data: FormData
) {
  const starts = data.batches
    .map(b => b.startDate)
    .toSorted((a, b) => a.localeCompare(b));
  const ends = data.batches
    .map(b => b.endDate)
    .toSorted((a, b) => a.localeCompare(b));
  return {
    resource: {
      resourceType: 'ResearchStudy' as const,
      id: study.id,
      title: data.title,
      description: data.description,
      status: study.status,
      principalInvestigator: study.principalInvestigator,
      protocol: planIds.map(id => ({ reference: `PlanDefinition/${id}` })),
      period: { start: starts[0], end: ends.at(-1) }
    },
    request: { method: 'PUT' as const, url: `ResearchStudy/${study.id}` }
  };
}

/**
 * Checks if a batch has been modified from its original PlanDefinition.
 */
export function isBatchModified(
  batch: FormData['batches'][number],
  planId: string,
  planDefinitions: PlanDefinition[]
): boolean {
  const original = planDefinitions.find(p => p.id === planId);
  if (!original) return true;
  const originalQs = (original.action ?? [])
    .map(a => extractQuestionnaireId(a.definitionCanonical))
    .filter((id): id is string => id !== null);
  const datesChanged =
    batch.startDate !== (original.effectivePeriod?.start ?? '') ||
    batch.endDate !== (original.effectivePeriod?.end ?? '');
  const qIdsChanged =
    JSON.stringify(
      batch.questionnaireIds.toSorted((a, b) => a.localeCompare(b))
    ) !== JSON.stringify(originalQs.toSorted((a, b) => a.localeCompare(b)));
  return datesChanged || qIdsChanged;
}

/**
 * Builds FHIR transaction entries for modified PlanDefinitions.
 */
export function buildPlanEntries(
  data: FormData,
  planIds: string[],
  lockedBatchIndices: number[],
  planDefinitions: PlanDefinition[]
) {
  return data.batches.flatMap((batch, i) => {
    if (lockedBatchIndices.includes(i)) return [];
    const planId = planIds[i];
    if (!planId || !isBatchModified(batch, planId, planDefinitions)) return [];
    const original = planDefinitions.find(p => p.id === planId);
    return [
      {
        resource: {
          resourceType: 'PlanDefinition' as const,
          id: planId,
          title: original?.title ?? `Batch ${i + 1}`,
          status: 'active' as const,
          effectivePeriod: { start: batch.startDate, end: batch.endDate },
          action: batch.questionnaireIds.map(qId => ({
            definitionCanonical: `Questionnaire/${qId}`
          }))
        },
        request: { method: 'PUT' as const, url: `PlanDefinition/${planId}` }
      }
    ];
  });
}

/**
 * Submits the edit form as a FHIR transaction bundle.
 */
/** Parameters for submitting an edit to an existing research study. */
interface SubmitEditStudyParams {
  study: ResearchStudy;
  planIds: string[];
  lockedBatchIndices: number[];
  planDefinitions: PlanDefinition[];
  data: FormData;
  router: ReturnType<typeof useRouter>;
}

/** Submits the edit form as a FHIR transaction bundle. */
export async function submitEditStudy({
  study,
  planIds,
  lockedBatchIndices,
  planDefinitions,
  data,
  router
}: SubmitEditStudyParams) {
  try {
    const API = await getAPI();
    const entries = [
      buildStudyEntry(study, planIds, data),
      ...buildPlanEntries(data, planIds, lockedBatchIndices, planDefinitions)
    ];
    await API.post('/fhir', {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: entries
    });
    toast.success('Study updated successfully');
    router.push('/research');
  } catch {
    toast.error('Failed to update study. Please try again.');
  }
}
