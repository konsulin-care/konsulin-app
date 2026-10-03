'use client';

import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import type { StudyProgress } from '@/utils/fhir/research';
import { useMemo } from 'react';
import { mapResearcherStudyToProgress } from './researcher-content';

/** Resolves the detail study from either researcher or patient data. */
export function useDetailStudy({
  isResearcher,
  detailStudyId,
  studies,
  researcherStudies
}: {
  isResearcher: boolean;
  detailStudyId: string | null;
  studies: StudyProgress[];
  researcherStudies: ResearchStudyWithBatches[];
}) {
  return useMemo(() => {
    if (isResearcher) {
      return mapResearcherStudyToProgress(
        researcherStudies.find(s => s.study.id === detailStudyId) ?? null
      );
    }
    return studies.find(s => s.study.id === detailStudyId) ?? null;
  }, [isResearcher, detailStudyId, studies, researcherStudies]);
}
