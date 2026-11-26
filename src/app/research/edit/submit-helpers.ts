import enToast from '@/messages/en/toast.json';
import { getAPI } from '@/services/api';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import { setResearchTarget } from '@/utils/fhir/research-target';
import {
  getEthicsStatus,
  getSharesFindings,
  getWhoCanJoin
} from '@/utils/fhir/study-metadata';
import type { StudyProfileInput } from '@/utils/fhir/study-profile';
import { applyStudyProfile } from '@/utils/fhir/study-profile';
import type { QueryClient } from '@tanstack/react-query';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { useRouter } from 'next/navigation';

import { toast } from 'react-toastify';
import type { FormData } from './research-form';

/**
 * Extract the organization id and display name from a study sponsor.
 * @param sponsor - the sponsor reference of the loaded study
 * @returns organization id (only for Organization references) and name
 */
function sponsorOrganization(sponsor?: ResearchStudy['sponsor']): {
  organizationId?: string;
  organizationName?: string;
} {
  const prefix = 'Organization/';
  const reference = sponsor?.reference;
  return {
    organizationId: reference?.startsWith(prefix)
      ? reference.slice(prefix.length)
      : undefined,
    organizationName: sponsor?.display
  };
}

/**
 * Builds protocol references for every batch in order.
 * @param planIds - existing PlanDefinition id per batch index
 * @param newPlanTempIds - temp UUID per new batch index
 * @param batchCount - number of batches in the form
 * @returns protocol references for the study
 */
function buildProtocol(
  planIds: (string | undefined)[],
  newPlanTempIds: Map<number, string>,
  batchCount: number
): NonNullable<ResearchStudy['protocol']> {
  const refs: NonNullable<ResearchStudy['protocol']> = [];
  for (let i = 0; i < batchCount; i += 1) {
    const existingId = planIds[i]; // skipcq: JS-0075 - safe numeric array index
    const tempId = newPlanTempIds.get(i);
    const reference = existingId ? `PlanDefinition/${existingId}` : tempId;
    if (reference) {
      refs.push({
        reference: existingId ? reference : `urn:uuid:${reference}`
      });
    }
  }
  return refs;
}

/** Returns the first defined value, or the fallback. */
function pick<T>(fallback: T, ...values: Array<T | undefined>): T {
  return values.find(value => value !== undefined) ?? fallback;
}

/** Trims a string, returning undefined for blank values. */
function trimmed(value?: string): string | undefined {
  return value?.trim() || undefined;
}

/**
 * Builds the profile input from form data, falling back to the loaded study.
 * @param study - the loaded ResearchStudy
 * @param data - the edited form data
 * @returns profile input for applyStudyProfile
 */
function buildProfileInput(
  study: ResearchStudy,
  data: FormData
): StudyProfileInput {
  const ethics = getEthicsStatus(study);
  return {
    ...sponsorOrganization(study.sponsor),
    leadName: pick('', study.principalInvestigator?.display),
    question: pick('', data.researchQuestion, study.objective?.[0]?.name),
    whoCanJoin: pick('', trimmed(data.whoCanJoin), getWhoCanJoin(study)),
    ethics: pick('applying', data.ethicsStatus, ethics?.code),
    ethicsReference: pick<string | undefined>(
      undefined,
      trimmed(data.ethicsReference),
      ethics?.reference
    ),
    sharesFindings: pick(false, data.sharesFindings, getSharesFindings(study))
  };
}

/**
 * Re-attaches the loaded sponsor when it is not an Organization reference.
 * @param study - the loaded ResearchStudy
 * @param profiled - the profiled ResearchStudy
 * @returns study that keeps its original sponsor when needed
 */
function keepSponsor(
  study: ResearchStudy,
  profiled: ResearchStudy
): ResearchStudy {
  if (!study.sponsor || profiled.sponsor) return profiled;
  return { ...profiled, sponsor: study.sponsor };
}

/**
 * Applies the edited participant target when the form provides one.
 * @param study - the ResearchStudy
 * @param data - the edited form data
 * @returns study with the target extension when provided
 */
function applyTarget(study: ResearchStudy, data: FormData): ResearchStudy {
  if (data.targetParticipants === undefined) return study;
  return setResearchTarget(study, data.targetParticipants);
}

/**
 * Builds the PUT request with an optimistic version check when available.
 * @param study - the loaded ResearchStudy
 * @returns transaction request descriptor
 */
function buildRequest(study: ResearchStudy) {
  const versionId = study.meta?.versionId;
  const request = {
    method: 'PUT' as const,
    url: `ResearchStudy/${study.id}`
  };
  return versionId ? { ...request, ifMatch: `W/"${versionId}"` } : request;
}

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

  const protocol = buildProtocol(planIds, newPlanTempIds, data.batches.length);

  const base: ResearchStudy = {
    ...study,
    title: data.title,
    description: data.description,
    status: study.status,
    principalInvestigator: study.principalInvestigator,
    protocol,
    period: { start: starts[0], end: ends.at(-1) }
  };

  const profiled = applyStudyProfile(base, buildProfileInput(study, data));
  const resource = keepSponsor(study, profiled);

  return {
    resource: applyTarget(resource, data),
    request: buildRequest(study)
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
  /** Optional translator for toast keys; falls back to the en messages. */
  tToast?: (key: string) => string;
}

/** Toast messages keyed by translation key; avoids variable-key indexing. */
const TOAST_MESSAGES = new Map<string, string>(
  Object.entries(enToast as Record<string, string>)
);

/** Resolves a toast key against the built-in English messages. */
function defaultToast(key: string): string {
  return TOAST_MESSAGES.get(key) ?? key;
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
  queryClient,
  tToast
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
    toast.success((tToast ?? defaultToast)('study_update_success'));
    await queryClient.invalidateQueries({ queryKey: ['researcher-dashboard'] });
    router.push('/research');
  } catch (error) {
    console.error('Failed to update study:', error);
    toast.error((tToast ?? defaultToast)('study_update_failed'));
  }
}
