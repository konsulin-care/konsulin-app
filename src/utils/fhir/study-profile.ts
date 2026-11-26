import {
  getEthicsStatus,
  getSharesFindings,
  getWhoCanJoin
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
