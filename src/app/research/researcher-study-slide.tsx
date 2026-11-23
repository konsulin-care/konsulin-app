'use client';

import { useTranslations } from '@/i18n';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { FlaskConical } from 'lucide-react';
import { truncateDescription } from './study-sections';

export interface ResearcherStudySlideProps {
  study: ResearchStudyWithBatches;
  isActive: boolean;
  onClick: (studyId: string) => void;
  /** Per-study participant count, or undefined while loading. */
  participantCount?: number;
}

/**
 * Researcher carousel slide card showing management-relevant study info.
 *
 * @param props - Study, active state, click handler and participant count.
 * @returns The researcher study slide.
 */
export default function ResearcherStudySlide({
  study,
  isActive,
  onClick,
  participantCount
}: Readonly<ResearcherStudySlideProps>) {
  const t = useTranslations('research');
  const { study: studyResource, currentBatch, daysRemaining } = study;
  const batchCount = study.batches.length;
  const questionnaireCount = currentBatch?.questionnaireIds.length ?? 0;
  const participantCountLabel =
    participantCount === 1
      ? t('researcher_slide.participants_one', { count: participantCount })
      : t('researcher_slide.participants_other', {
          count: participantCount ?? '—'
        });

  return (
    <div
      data-testid={`researcher-slide-${studyResource.id}`}
      className={`card border-border focus-within:ring-turquoise-deep bg-card relative flex h-full flex-col gap-2 p-4 transition-all duration-300 focus-within:ring-2 ${
        isActive ? 'opacity-100' : 'opacity-70'
      }`}
    >
      <button
        type='button'
        aria-label={t('carousel.open_study', { title: studyResource.title })}
        onClick={() => {
          onClick(studyResource.id);
        }}
        className='absolute inset-0 z-0 cursor-pointer'
      />
      <div className='pointer-events-none relative z-10 flex flex-col gap-2'>
        {/* Header: icon + title + status */}
        <div className='flex items-start gap-2'>
          <FlaskConical className='text-foreground mt-0.5 h-5 w-5 shrink-0' />
          <div className='flex min-w-0 flex-col'>
            <h3 className='text-foreground text-sm font-bold'>
              {studyResource.title}
            </h3>
            <span className='bg-muted text-charcoal-700 mt-0.5 inline-block w-fit rounded-full px-2 py-0.5 text-xs font-medium'>
              {studyResource.status}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className='text-muted-foreground text-xs leading-4'>
          {truncateDescription(studyResource.description)}
        </p>

        {/* Batch info */}
        <div className='text-muted-foreground flex items-center gap-1 text-xs'>
          <span>
            {batchCount === 1
              ? t('researcher_slide.batches_one', { count: batchCount })
              : t('researcher_slide.batches_other', { count: batchCount })}
          </span>
          {currentBatch && (
            <>
              <span>&middot;</span>
              <span>
                {daysRemaining === 1
                  ? t('researcher_slide.closes_in_one', { days: daysRemaining })
                  : t('researcher_slide.closes_in_other', {
                      days: daysRemaining
                    })}
              </span>
            </>
          )}
        </div>

        {/* Stats row */}
        <div className='text-muted-foreground flex items-center gap-3 text-xs'>
          <span>{participantCountLabel}</span>
          <span>&middot;</span>
          <span>
            {questionnaireCount === 1
              ? t('researcher_slide.questionnaires_one', {
                  count: questionnaireCount
                })
              : t('researcher_slide.questionnaires_other', {
                  count: questionnaireCount
                })}
          </span>
        </div>
      </div>
    </div>
  );
}
