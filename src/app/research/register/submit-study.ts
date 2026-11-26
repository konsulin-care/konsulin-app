import { getAPI } from '@/services/api';
import { setResearchTarget } from '@/utils/fhir/research-target';
import { applyStudyProfile } from '@/utils/fhir/study-profile';
import type { ResearchStudy } from 'fhir/r4';
import type { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import type { FormData } from './research-form';

/** Parameters for posting a new research study. */
export interface SubmitStudyOptions {
  data: FormData;
  userId: string | undefined;
  storageKey: string;
  router: ReturnType<typeof useRouter>;
  tToast: (key: string) => string;
  /** Organization of the researcher; a researcher without one posts no sponsor. */
  organizationId?: string;
  /** Organization display name, written to sponsor.display. */
  organizationName?: string;
  /** Lead investigator name from the signed-in user. */
  leadName?: string;
}

/**
 * Create one PlanDefinition per batch, keeping batch order in the result.
 * @param API - API client
 * @param batches - batch form data
 * @returns PlanDefinition ids in batch order
 */
async function createPlanDefinitions(
  API: Awaited<ReturnType<typeof getAPI>>,
  batches: FormData['batches']
): Promise<(string | undefined)[]> {
  return Promise.all(
    batches.map(async (batch, index) => {
      const res: { data: { id?: string } } = await API.post(
        '/fhir/PlanDefinition',
        {
          resourceType: 'PlanDefinition',
          title: `Batch ${index + 1}`,
          status: 'active',
          effectivePeriod: { start: batch.startDate, end: batch.endDate },
          action: batch.questionnaireIds.map(qId => ({
            definitionCanonical: `Questionnaire/${qId}`
          }))
        }
      );
      return res.data.id;
    })
  );
}

/**
 * Build the ResearchStudy resource for the submitted form.
 * @param data - form values
 * @param userId - signed-in practitioner id
 * @param planIds - created PlanDefinition ids in batch order
 * @returns the ResearchStudy, with the target extension when a target is set
 */
function buildStudy(
  data: FormData,
  userId: string | undefined,
  planIds: (string | undefined)[]
): ResearchStudy {
  const starts = data.batches
    .map(b => b.startDate)
    .toSorted((a, b) => a.localeCompare(b));
  const ends = data.batches
    .map(b => b.endDate)
    .toSorted((a, b) => a.localeCompare(b));

  const study: ResearchStudy = {
    resourceType: 'ResearchStudy',
    title: data.title,
    description: data.description,
    status: 'active',
    principalInvestigator: { reference: `Practitioner/${userId}` },
    protocol: planIds
      .filter(id => id !== undefined)
      .map(id => ({ reference: `PlanDefinition/${id}` })),
    period: { start: starts[0], end: ends.at(-1) }
  };
  return data.targetParticipants === undefined
    ? study
    : setResearchTarget(study, data.targetParticipants);
}

/**
 * POST a new research study to the API.
 * @param API - API client
 * @param options - form data, author, router, toast translator and profile
 * @returns nothing; clears the draft, toasts success and routes home
 */
export const submitStudy = async (
  API: Awaited<ReturnType<typeof getAPI>>,
  options: SubmitStudyOptions
) => {
  const { data, userId, storageKey, router, tToast } = options;
  const planIds = await createPlanDefinitions(API, data.batches);
  const study = applyStudyProfile(buildStudy(data, userId, planIds), {
    organizationId: options.organizationId,
    organizationName: options.organizationName,
    leadName: options.leadName ?? '',
    question: data.researchQuestion ?? '',
    whoCanJoin: data.whoCanJoin?.trim() || undefined,
    ethics: data.ethicsStatus ?? 'applying',
    ethicsReference: data.ethicsReference?.trim() || undefined,
    sharesFindings: data.sharesFindings ?? false
  });

  await API.post('/fhir/ResearchStudy', study);

  localStorage.removeItem(storageKey);
  toast.success(tToast('research_create_success'));
  router.push('/');
};
