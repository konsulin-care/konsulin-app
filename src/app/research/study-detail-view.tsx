'use client';

import ShareResearchButton from '@/components/research/share-research-button';
import AppDrawer from '@/components/ui/app-drawer';
import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import { FlaskConical } from 'lucide-react';
import {
  BatchProgress,
  QuestionnaireList,
  TimelineStrip
} from './study-sections';

interface StudyDetailViewProps {
  progress: StudyProgress | null;
  overlapMap: Map<string, string[]>;
  open: boolean;
  onClose: () => void;
  onParticipate: (progress: StudyProgress) => void;
  onSeeReport: (studyId: string) => void;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
  isPatient: boolean;
  fhirId?: string;
  /** Resolved id → questionnaire info map (title + estimated duration). */
  titleMap?: Readonly<Record<string, QuestionnaireInfo>>;
  /** True while questionnaire titles are being fetched. */
  isTitlesLoading?: boolean;
}

/**
 * Study detail drawer opened by tapping a carousel card.
 *
 * Shows the untruncated description, batch progress, batch timeline, and the
 * full questionnaire list with a sticky Participate CTA at the footer.
 */
export default function StudyDetailView({
  progress,
  overlapMap,
  open,
  onClose,
  onParticipate,
  onSeeReport,
  onQuestionnaireClick,
  isPatient,
  fhirId,
  titleMap,
  isTitlesLoading
}: Readonly<StudyDetailViewProps>) {
  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={
        progress && (
          <span className='flex items-center gap-2'>
            <FlaskConical className='h-5 w-5 shrink-0 text-black' />
            {progress.study.title}
          </span>
        )
      }
      description={
        progress ? (
          <span className='block text-left text-gray-600'>
            {progress.study.description}
          </span>
        ) : undefined
      }
      ctaLabel={progress?.isComplete ? 'See Report' : 'Participate'}
      onCtaClick={() => {
        if (!progress) return;
        if (progress.isComplete) {
          onSeeReport(progress.study.id);
        } else {
          onParticipate(progress);
        }
      }}
      ctaDisabled={!progress}
    >
      {progress && (
        <div className='flex flex-col gap-4 px-4 pb-4'>
          <BatchProgress progress={progress} />
          <TimelineStrip progress={progress} />
          <QuestionnaireList
            progress={progress}
            overlapMap={overlapMap}
            onQuestionnaireClick={onQuestionnaireClick}
            titleMap={titleMap}
            isTitlesLoading={isTitlesLoading}
            showOverlapHints
          />
          <ShareResearchButton
            title={progress.study.title}
            isPatient={isPatient}
            fhirId={fhirId}
            studyId={progress.study.id}
            dataTestId={`research-share-${progress.study.id}`}
            className='flex cursor-pointer items-center justify-center gap-1.5 border-t border-gray-100 pt-3 text-[10px] text-black'
          />
        </div>
      )}
    </AppDrawer>
  );
}
