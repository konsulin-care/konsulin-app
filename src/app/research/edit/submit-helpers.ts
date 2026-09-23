import { getAPI } from '@/services/api';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import type { QueryClient } from '@tanstack/react-query';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { useRouter } from 'next/navigation';

import { toast } from 'react-toastify';
import type { FormData } from './research-form';

/**
 * Builds the FHIR transaction entry for updating a ResearchStudy.
 */
export function buildStudyEntry(
  study: ResearchStudy,
  planIds: (string | undefined)[],
  newPlanTempIds: Map<number, string>,
  data: FormData
) {
  const starts = data.batches
    .map(b => b.startDate)
    .toSorted((a, b) => a.localeCompare(b));
  const ends = data.batches
    .map(b => b.endDate)
    .toSorted((a, b) => a.localeCompare(b));

  const protocol = data.batches
    .map((_, i) => {
      const existingId = planIds[i]; // skipcq: JS-0075 - safe numeric array index
      if (existingId) {
        return { reference: `PlanDefinition/${existingId}` };
      }
      const tempId = newPlanTempIds.get(i);
      if (tempId) {
        return { reference: `urn:uuid:${tempId}` };
      }
      return null;
    })
    .filter((ref): ref is { reference: string } => ref !== null);

  return {
    resource: {
      resourceType: 'ResearchStudy' as const,
      id: study.id,
      title: data.title,
      description: data.description,
      status: study.status,
      principalInvestigator: study.principalInvestigator,
      protocol,
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

/** Result of building plan entries for a transaction bundle. */
export interface BuildPlanEntriesResult {
  /** Transaction entries for new or modified PlanDefinitions. */
  entries: Array<{
    fullUrl?: string;
    resource: Record<string, unknown>;
    request: { method: string; url: string };
  }>;
  newPlanTempIds: Map<number, string>;
}

/**
 * Builds FHIR transaction entries for new or modified PlanDefinitions.
 *
 * New batches (no planId) produce POST entries with urn:uuid: fullUrl.
 * Modified existing batches produce PUT entries with their real ID.
 *
 * @returns Entries and a map of batch indices to temp UUIDs for new plans.
 */
export function buildPlanEntries(
  data: FormData,
  planIds: (string | undefined)[],
  lockedBatchIndices: number[],
  planDefinitions: PlanDefinition[]
): BuildPlanEntriesResult {
  const newPlanTempIds = new Map<number, string>();
  type PlanEntry = BuildPlanEntriesResult['entries'][number];
  const entries = data.batches.flatMap<PlanEntry>((batch, i) => {
    if (lockedBatchIndices.includes(i)) return [];
    const planId = planIds[i]; // skipcq: JS-0075 - safe numeric array index

    if (planId) {
      if (!isBatchModified(batch, planId, planDefinitions)) return [];
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
    }

    // New batch: create with temporary UUID
    const tempId = crypto.randomUUID();
    newPlanTempIds.set(i, tempId);
    return [
      {
        fullUrl: `urn:uuid:${tempId}`,
        resource: {
          resourceType: 'PlanDefinition' as const,
          title: `Batch ${i + 1}`,
          status: 'active' as const,
          effectivePeriod: { start: batch.startDate, end: batch.endDate },
          action: batch.questionnaireIds.map(qId => ({
            definitionCanonical: `Questionnaire/${qId}`
          }))
        },
        request: { method: 'POST' as const, url: 'PlanDefinition' }
      }
    ];
  }) satisfies BuildPlanEntriesResult['entries'];
  return { entries, newPlanTempIds };
}

/**
 * Submits the edit form as a FHIR transaction bundle.
 */
/** Parameters for submitting an edit to an existing research study. */
interface SubmitEditStudyParams {
  study: ResearchStudy;
  planIds: (string | undefined)[];
  lockedBatchIndices: number[];
  planDefinitions: PlanDefinition[];
  data: FormData;
  router: ReturnType<typeof useRouter>;
  queryClient: QueryClient;
}

/** Submits the edit form as a FHIR transaction bundle. */
// skipcq: JS-0100 - errors handled internally via try/catch + toast
export async function submitEditStudy({
  study,
  planIds,
  lockedBatchIndices,
  planDefinitions,
  data,
  router,
  queryClient
}: SubmitEditStudyParams) {
  try {
    const API = await getAPI();
    const { entries: planEntries, newPlanTempIds } = buildPlanEntries(
      data,
      planIds,
      lockedBatchIndices,
      planDefinitions
    );
    const studyEntry = buildStudyEntry(study, planIds, newPlanTempIds, data);
    const entries = [studyEntry, ...planEntries];
    await API.post('/fhir', {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: entries
    });
    toast.success('Study updated successfully');
    await queryClient.invalidateQueries({ queryKey: ['researcher-dashboard'] });
    router.push('/research');
  } catch {
    toast.error('Failed to update study. Please try again.');
  }
}
