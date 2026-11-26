'use client';

import EmptyState from '@/components/general/empty-state';
import { useTranslations } from '@/i18n';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import type { StudyProgress } from '@/utils/fhir/research';
import type { ResearchStudy } from 'fhir/r4';
import { useState } from 'react';
import ResearchSkeleton from './research-skeleton';
import FindingComposer from './researcher/finding-composer';
import GivenBackList from './researcher/given-back-list';
import NextStepCard from './researcher/next-step-card';
import ResearcherIntro, {
  ResearcherSectionHeading
} from './researcher/researcher-intro';
import ResearcherStudyCard from './researcher/researcher-study-card';

export interface ResearcherContentProps {
  /** True while the researcher dashboard query is loading. */
  isLoading: boolean;
  /** Researcher studies with their batches. */
  studies: ResearchStudyWithBatches[];
  /** True when the researcher dashboard query failed. */
  isError?: boolean;
  /** Legacy carousel focus id, kept for the research content facade. */
  activeId?: string;
  /** Legacy carousel slide handler, kept for the research content facade. */
  onSlideChange?: (studyId: string) => void;
  /** Legacy carousel study click handler, kept for the facade. */
  onStudyClick?: (studyId: string) => void;
  /** Legacy practitioner id prop, kept for the research content facade. */
  practitionerId?: string;
  /** Legacy active study id prop, kept for the research content facade. */
  activeStudyId?: string;
}

/** Props of the researcher studies section. */
interface StudiesSectionProps {
  /** Researcher studies to render as cards. */
  studies: ResearchStudyWithBatches[];
  /** Called with the study resource when a card asks to post a finding. */
  onPostFinding: (study: ResearchStudy) => void;
}

/** Maps researcher study data to the StudyProgress format used by hooks. */
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
    history: []
  };
}

/**
 * Renders the researcher studies as a card grid, or the empty state when the
 * researcher has no studies yet.
 *
 * @param props - Studies and the post-finding callback.
 * @returns The grid or the empty state element.
 */
function StudiesSection({
  studies,
  onPostFinding
}: Readonly<StudiesSectionProps>) {
  const t = useTranslations('research');

  if (studies.length === 0) {
    return (
      <EmptyState
        className='py-8'
        title={t('no_studies_title')}
        subtitle={t('no_studies_subtitle')}
      />
    );
  }

  return (
    <ul className='grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6'>
      {studies.map((entry, index) => (
        <li key={entry.study.id ?? String(index)}>
          <ResearcherStudyCard study={entry} onPostFinding={onPostFinding} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Researcher home: the intro, next step, study cards and the findings the
 * researcher gave back, with an inline composer for a new finding.
 *
 * @param props - Loading flag, studies and error flag.
 * @returns The researcher home element or its loading skeleton.
 */
export default function ResearcherContent({
  isLoading,
  studies,
  isError = false
}: Readonly<ResearcherContentProps>) {
  const [composerStudy, setComposerStudy] = useState<ResearchStudy | null>(
    null
  );

  if (isLoading) {
    return <ResearchSkeleton />;
  }

  const studyResources = studies.map(entry => entry.study);

  return (
    <div data-testid='researcher-home' className='flex flex-col gap-6'>
      <ResearcherIntro />
      <section
        data-testid='researcher-next-step'
        className='flex flex-col gap-3'
      >
        <ResearcherSectionHeading kind='next-step' />
        <NextStepCard studies={studies} onPostFinding={setComposerStudy} />
      </section>
      <section data-testid='researcher-studies' className='flex flex-col gap-3'>
        <ResearcherSectionHeading kind='your-studies' count={studies.length} />
        <StudiesSection studies={studies} onPostFinding={setComposerStudy} />
      </section>
      <section
        data-testid='researcher-given-back'
        className='flex flex-col gap-3'
      >
        <ResearcherSectionHeading kind='given-back' />
        {composerStudy ? <FindingComposer study={composerStudy} /> : null}
        <GivenBackList studies={studyResources} isError={isError} />
      </section>
    </div>
  );
}
