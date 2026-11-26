import {
  getEthicsStatus,
  getSharesFindings,
  getWhoCanJoin,
  setEthicsStatus,
  setSharesFindings,
  setWhoCanJoin
} from '@/utils/fhir/study-metadata';
import type { ResearchStudy } from 'fhir/r4';

export interface StudyProfile {
  groupName?: string;
  isKonsulin: boolean;
  leadName?: string;
  question?: string;
  whoCanJoin?: string;
  ethics: 'applying' | 'approved' | 'exempt' | 'not-stated';
  ethicsReference?: string;
  sharesFindings: boolean;
}

export interface StudyProfileInput {
  organizationId?: string;
  organizationName?: string;
  leadName: string;
  question: string;
  whoCanJoin?: string;
  ethics: 'applying' | 'approved' | 'exempt';
  ethicsReference?: string;
  sharesFindings: boolean;
}

/**
 * Apply profile input to a study, returning a new resource.
 * @param study - the ResearchStudy
 * @param input - profile fields
 * @returns new ResearchStudy
 */
export function applyStudyProfile(
  study: ResearchStudy,
  input: StudyProfileInput
): ResearchStudy {
  const rest: ResearchStudy = { ...study };
  delete rest.sponsor;
  let next: ResearchStudy = {
    ...rest,
    principalInvestigator: {
      ...study.principalInvestigator,
      display: input.leadName
    },
    objective: [
      { ...study.objective?.[0], name: input.question },
      ...(study.objective?.slice(1) ?? [])
    ]
  };
  if (input.organizationId) {
    next.sponsor = {
      reference: `Organization/${input.organizationId}`,
      display: input.organizationName
    };
  }
  if (input.whoCanJoin) next = setWhoCanJoin(next, input.whoCanJoin);
  next = setEthicsStatus(next, {
    code: input.ethics,
    ...(input.ethicsReference ? { reference: input.ethicsReference } : {})
  });
  return setSharesFindings(next, input.sharesFindings);
}

/**
 * Read the display profile of a research study.
 * @param study - the ResearchStudy
 * @param konsulinOrgId - configured Konsulin organization id (may be empty)
 * @returns profile; groupName undefined means the UI shows Konsulin
 */
export function readStudyProfile(
  study: ResearchStudy,
  konsulinOrgId: string
): StudyProfile {
  const sponsor = study.sponsor;
  const isKonsulin =
    !sponsor ||
    (konsulinOrgId !== '' &&
      sponsor.reference === `Organization/${konsulinOrgId}`);
  const ethics = getEthicsStatus(study);
  return {
    groupName: isKonsulin ? undefined : sponsor?.display,
    isKonsulin,
    leadName: study.principalInvestigator?.display,
    question: study.objective?.[0]?.name,
    whoCanJoin: getWhoCanJoin(study),
    ethics: ethics?.code ?? 'not-stated',
    ethicsReference: ethics?.reference,
    sharesFindings: getSharesFindings(study) ?? false
  };
}
