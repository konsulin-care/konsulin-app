'use client';

import ParticipantProgress from '@/app/research/researcher/participant-progress';
import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import { useStudyParticipantCount } from '@/services/api/research-counts';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import type { ResearchBatch } from '@/utils/fhir/research';
import { getResearchTarget } from '@/utils/fhir/research-target';
import { formatBatchDate } from '@/utils/format-batch-date';

/** Props of the manage-page overview card. */
export interface OverviewCardProps {
  /** Study with its batches and computed metadata. */
  study: ResearchStudyWithBatches;
  /** Reference date, yyyy-mm-dd. */
  today: string;
}

/** State of one batch relative to the reference date. */
type BatchState = 'closed' | 'open' | 'upcoming';

/** Message key carrying the label of each batch state. */
const STATE_KEY: Record<BatchState, string> = {
  closed: 'manage.batch_closed',
  open: 'manage.batch_open',
  upcoming: 'manage.batch_upcoming'
};

/**
 * Classifies a batch relative to the reference date.
 *
 * @param batch - The batch to classify.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns Closed, open, or upcoming.
 */
function stateOf(batch: ResearchBatch, today: string): BatchState {
  if (batch.end < today) return 'closed';
  if (batch.start <= today) return 'open';
  return 'upcoming';
}

/**
 * One row of the batch list: number, date range and state label.
 *
 * @param props - Batch, its position, and the reference date.
 * @returns The batch row element.
 */
function BatchRow({
  batch,
  index,
  today
}: Readonly<{ batch: ResearchBatch; index: number; today: string }>) {
  const t = useTranslations('research');
  const locale = useLocale();
  const state = stateOf(batch, today);

  return (
    <li
      data-testid='overview-batch'
      data-batch-id={batch.id}
      data-state={state}
      className='flex flex-wrap items-baseline justify-between gap-2'
    >
      <span className='text-foreground text-sm font-medium'>
        {t('batch_number', { index: index + 1 })}
      </span>
      <span className='text-muted-foreground text-xs'>
        {`${formatBatchDate(batch.start, locale)} – ${formatBatchDate(batch.end, locale)}`}
      </span>
      <span className='text-charcoal-700 text-xs'>{t(STATE_KEY[state])}</span>
    </li>
  );
}

/**
 * Read-only overview of a study: participant progress against the target and
 * every batch with its date range and state. Renders no action.
 *
 * @param props - Study and the reference date.
 * @returns The overview card element.
 */
export default function OverviewCard({
  study,
  today
}: Readonly<OverviewCardProps>) {
  const t = useTranslations('research');
  const target = getResearchTarget(study.study) ?? 0;
  const { data: participantCount, isLoading } = useStudyParticipantCount(
    study.study.id
  );

  return (
    <section
      data-testid='overview-card'
      className='border-border bg-card flex flex-col gap-4 rounded-lg border p-4'
    >
      <h2 className='text-foreground text-base font-bold'>
        {t('manage.overview_heading')}
      </h2>
      <ParticipantProgress
        count={participantCount ?? 0}
        target={target}
        isLoading={isLoading}
      />
      <ul data-testid='overview-batches' className='flex flex-col gap-2'>
        {study.batches.map((batch, index) => (
          <BatchRow key={batch.id} batch={batch} index={index} today={today} />
        ))}
      </ul>
    </section>
  );
}
