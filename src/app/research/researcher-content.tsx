'use client';

import EmptyState from '@/components/general/empty-state';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import type { StudyProgress } from '@/utils/fhir/research';
import ResearchSkeleton from './research-skeleton';
import ResearcherCarousel from './researcher-carousel';

export interface ResearcherContentProps {
  isLoading: boolean;
  studies: ResearchStudyWithBatches[];
  activeId: string;
  onSlideChange: (studyId: string) => void;
  onStudyClick: (studyId: string) => void;
}

/** Maps researcher study data to the StudyProgress format expected by StudyDetailView. */
export function mapResearcherStudyToProgress(
  study: ResearchStudyWithBatches | null
): StudyProgress | null {
  if (!study) return null;
  return {
    study: study.study,
    batches: study.batches,
    currentBatch: study.currentBatch,
    completedCount: 0,
    totalCount: study.currentBatch?.questionnaireIds.length ?? 0,
    isComplete: false,
    firstUncompletedQuestionnaireId: null,
    completedQuestionnaireIds: [],
    history: [],
    consecutiveBatches: 0
  };
}

/** Renders the researcher-specific content: loading, empty, or carousel. */
export default function ResearcherContent({
  isLoading,
  studies,
  activeId,
  onSlideChange,
  onStudyClick
}: Readonly<ResearcherContentProps>) {
  if (isLoading) {
    return <ResearchSkeleton />;
  }

  if (studies.length === 0) {
    return (
      <EmptyState
        className='py-16'
        title='No research studies yet'
        subtitle='Register your first study to get started.'
      />
    );
  }

  return (
    <ResearcherCarousel
      studies={studies}
      activeId={activeId}
      onSlideChange={onSlideChange}
      onStudyClick={onStudyClick}
    />
  );
}
