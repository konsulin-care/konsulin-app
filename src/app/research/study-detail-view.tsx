'use client';

import ShareResearchButton from '@/components/research/share-research-button';
import AppDrawer from '@/components/ui/app-drawer';
import { Roles } from '@/constants/roles';
import { useTranslations } from '@/i18n';
import type { QuestionnaireInfo } from '@/services/api/research';
import type { StudyProgress } from '@/utils/fhir/research';
import { FlaskConical } from 'lucide-react';
import BatchTrail from './batch-trail';
import { CollectiveGoal } from './collective-goal';
import { BatchProgress, QuestionnaireList } from './study-sections';

interface StudyDetailViewProps {
  progress: StudyProgress | null;
  overlapMap: Map<string, string[]>;
  open: boolean;
  onClose: () => void;
  onParticipate: (progress: StudyProgress) => void;
  onSeeReport: (studyId: string) => void;
  onQuestionnaireClick: (studyId: string, questionnaireId: string) => void;
  onManageStudy?: (studyId: string) => void;
  isPatient: boolean;
  /** True when the user has consented to the rendered study. */
  isConsented?: boolean;
  /** Batches with a queued response awaiting synchronization. */
  waitingBatchIds?: ReadonlySet<string>;
  fhirId?: string;
  /** User's role name for conditional rendering. */
  roleName?: string;
  /** Resolved id → questionnaire info map (title + estimated duration). */
  titleMap?: ReadonlyMap<string, QuestionnaireInfo>;
  /** True while questionnaire titles are being fetched. */
  isTitlesLoading?: boolean;
}

/**
 * Study detail drawer opened by tapping a carousel card.
 *
 * Shows the untruncated description, batch progress, batch trail, collective
 * goal, and the full questionnaire list with a sticky Participate CTA at the
 * footer.
 */
export default function StudyDetailView({
  progress,
  overlapMap,
  open,
  onClose,
  onParticipate,
  onSeeReport,
  onQuestionnaireClick,
  onManageStudy,
  isPatient,
  isConsented = false,
  waitingBatchIds,
  fhirId,
  roleName,
  titleMap,
  isTitlesLoading
}: Readonly<StudyDetailViewProps>) {
  const t = useTranslations('research');
  const isResearcher = roleName === Roles.Researcher;
  const isGuest = !isPatient && !isResearcher;
  const isComplete = progress?.isComplete ?? false;
  let ctaLabel = t('participate');
  if (isResearcher) ctaLabel = t('manage_study');
  else if (isComplete) ctaLabel = t('see_report');

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={
        progress && (
          <span className='flex items-center gap-2'>
            <FlaskConical className='text-foreground h-5 w-5 shrink-0' />
            {progress.study.title}
          </span>
        )
      }
      description={
        progress ? (
          <span className='text-muted-foreground block text-left'>
            {progress.study.description}
          </span>
        ) : undefined
      }
      ctaLabel={ctaLabel}
      onCtaClick={() => {
        if (!progress) return;
        if (isResearcher) {
          onManageStudy?.(progress.study.id);
          return;
        }
        if (progress.isComplete) {
          onSeeReport(progress.study.id);
        } else {
          onParticipate(progress);
        }
      }}
      ctaDisabled={!progress}
    >
      {progress && (
        <div className='flex flex-col gap-4'>
          <BatchProgress progress={progress} />
          <BatchTrail progress={progress} waitingBatchIds={waitingBatchIds} />
          <CollectiveGoal
            study={progress.study}
            isGuest={isGuest}
            isConsented={isConsented}
          />
          <QuestionnaireList
            progress={progress}
            overlapMap={overlapMap}
            onQuestionnaireClick={onQuestionnaireClick}
            titleMap={titleMap}
            isTitlesLoading={isTitlesLoading}
            showOverlapHints
          />
          {isResearcher && (
            <div className='bg-muted text-muted-foreground rounded-lg p-3 text-xs'>
              <p className='text-charcoal-700 font-medium'>
                {t('researcher_view')}
              </p>
              <p className='mt-1'>{t('participant_data_note')}</p>
            </div>
          )}
          <ShareResearchButton
            title={progress.study.title}
            isPatient={isPatient}
            fhirId={fhirId}
            studyId={progress.study.id}
            dataTestId={`research-share-${progress.study.id}`}
            className='border-border text-foreground flex cursor-pointer items-center justify-center gap-1.5 border-t pt-3 text-xs'
          />
        </div>
      )}
    </AppDrawer>
  );
}
