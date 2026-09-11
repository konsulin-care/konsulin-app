'use client';

import EmptyState from '@/components/general/empty-state';
import ReferralNotice from '@/components/research/referral-notice';
import type { QuestionnaireInfo } from '@/services/api/questionnaire-info';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import type { StudyProgress } from '@/utils/fhir/research';
import ContributionDashboard from './contribution-dashboard';
import ResearchCarousel from './research-carousel';
import ResearchSkeleton from './research-skeleton';
import ResearcherContent from './researcher-content';

export interface ResearchContentProps {
  isResearcher: boolean;
  researcherLoading: boolean;
  researcherStudies: ResearchStudyWithBatches[];
  isLoading: boolean;
  progress: import('@/utils/fhir/research').ResearchProgress | undefined;
  studies: StudyProgress[];
  activeStudyId: string;
  activeStudy: StudyProgress | null;
  titleMap: ReadonlyMap<string, QuestionnaireInfo>;
  titlesPending: boolean;
  fhirId?: string;
  onSlideChange: (studyId: string) => void;
  onResearcherStudyClick: (studyId: string) => void;
  onStudyClick: (studyId: string) => void;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
}

/** Renders the appropriate content based on user role and data state. */
export default function ResearchContent({
  isResearcher,
  researcherLoading,
  researcherStudies,
  isLoading,
  progress,
  studies,
  activeStudyId,
  activeStudy,
  titleMap,
  titlesPending,
  fhirId,
  onSlideChange,
  onResearcherStudyClick,
  onStudyClick,
  onQuestionnaireClick
}: Readonly<ResearchContentProps>) {
  if (isResearcher) {
    return (
      <ResearcherContent
        isLoading={researcherLoading}
        studies={researcherStudies}
        activeId={activeStudyId}
        onSlideChange={onSlideChange}
        onStudyClick={onResearcherStudyClick}
      />
    );
  }

  if (isLoading) return <ResearchSkeleton />;

  if (!progress || progress.studies.length === 0) {
    return (
      <EmptyState
        className='py-16'
        title='No ongoing research'
        subtitle='There are currently no research studies available.'
      />
    );
  }

  return (
    <>
      <ReferralNotice />
      <ResearchCarousel
        studies={studies}
        activeId={activeStudyId}
        onSlideChange={onSlideChange}
        onStudyClick={onStudyClick}
        onQuestionnaireClick={onQuestionnaireClick}
        isPatient={Boolean(fhirId)}
        fhirId={fhirId}
        titleMap={titleMap}
        isTitlesLoading={titlesPending}
      />
      <ContributionDashboard
        progress={progress}
        activeStudy={activeStudy}
        questionnaireInfo={titleMap}
      />
    </>
  );
}
