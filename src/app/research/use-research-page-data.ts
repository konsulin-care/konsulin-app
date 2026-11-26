'use client';

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import {
  EMPTY_QUESTIONNAIRE_INFO_MAP,
  useQuestionnaireTitles
} from '@/services/api/questionnaire-info';
import { useResearchProgress } from '@/services/api/research';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { useResearcherDashboard } from '@/services/api/researcher';
import type { StudyProgress } from '@/utils/fhir/research';
import { useMemo } from 'react';
import { mapResearcherStudyToProgress } from './researcher-content';

/** Stable empty fallbacks so memo inputs keep a constant identity. */
const EMPTY_IDS: string[] = [];
const EMPTY_STUDIES: StudyProgress[] = [];
const EMPTY_RESEARCHER_STUDIES: ResearchStudyWithBatches[] = [];

/**
 * Appends researcher studies not already in progress.
 *
 * @param studies Studies from the progress query.
 * @param researcherStudies Studies from the researcher dashboard.
 * @param isResearcher Whether the user is a researcher.
 * @returns The progress studies unchanged for non-researchers, else merged.
 */
export function mergeResearcherStudies(
  studies: StudyProgress[],
  researcherStudies: ResearchStudyWithBatches[],
  isResearcher: boolean
): StudyProgress[] {
  if (!isResearcher) return studies;
  const knownIds = new Set(studies.map(s => s.study.id));
  const converted = researcherStudies.map(s => mapResearcherStudyToProgress(s));
  return [
    ...studies,
    ...converted.filter(
      (s): s is StudyProgress => s !== null && !knownIds.has(s.study.id)
    )
  ];
}

/**
 * Composes the data the research page renders.
 *
 * @param activeStudyId Focused study id, or null for the first study.
 * @returns Progress, studies, researcher data, titles and auth fallbacks.
 */
export function useResearchPageData(activeStudyId: string | null) {
  const { state: authState } = useAuth();
  const fhirId = authState?.userInfo?.fhirId;
  const roleName = authState?.userInfo?.role_name;
  const isResearcher = roleName === Roles.Researcher;
  const { data: progress, isLoading } = useResearchProgress();
  const studies = useMemo(() => progress?.studies ?? EMPTY_STUDIES, [progress]);
  const { data: researcherData, isLoading: researcherLoading } =
    useResearcherDashboard(isResearcher ? fhirId : undefined);
  const researcherStudies = useMemo(
    () => researcherData?.studies ?? EMPTY_RESEARCHER_STUDIES,
    [researcherData]
  );
  const resolvedStudies = useMemo(
    () => mergeResearcherStudies(studies, researcherStudies, isResearcher),
    [studies, researcherStudies, isResearcher]
  );
  const completedIds = progress?.completedQuestionnaireIds ?? EMPTY_IDS;
  const questionnaireIds = useMemo(
    () => [
      ...new Set([
        ...resolvedStudies.flatMap(s => s.currentBatch?.questionnaireIds ?? []),
        ...completedIds
      ])
    ],
    [resolvedStudies, completedIds]
  );
  const {
    data: titleMap = EMPTY_QUESTIONNAIRE_INFO_MAP,
    isPending: titlesPending
  } = useQuestionnaireTitles(questionnaireIds);
  const effectiveActiveId = activeStudyId ?? studies[0]?.study.id ?? '';
  return {
    progress,
    isLoading,
    studies,
    researcherStudies,
    researcherLoading,
    titleMap,
    titlesPending,
    effectiveActiveId,
    fhirId,
    roleName,
    isResearcher,
    consentedStudyIds: progress?.consentedStudyIds ?? EMPTY_IDS
  };
}
