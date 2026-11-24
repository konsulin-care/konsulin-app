'use client';

import BatchTrail from '@/app/research/batch-trail';
import { useTranslations } from '@/i18n';
import type { ParticipationStats } from '@/utils/fhir/report';
import { sortBatches, type StudyProgress } from '@/utils/fhir/research';
import { getNextBatch } from '@/utils/fhir/research-schedule';

import { formatDay } from './batch-meta';

/** Props for the report trail section. */
export interface ReportTrailProps {
  study: StudyProgress;
  /** Participation stats, or null when responses are not available yet. */
  stats: ParticipationStats | null;
  /** Reference date, yyyy-mm-dd. */
  today: string;
}

/**
 * Report trail section: the batch trail, a one-line participation caption,
 * and the next-batch or last-batch line.
 *
 * @param props - Study progress, participation stats, and reference date.
 * @returns The trail section.
 */
export function ReportTrail({
  study,
  stats,
  today
}: Readonly<ReportTrailProps>) {
  const t = useTranslations('common');
  const nextBatch = getNextBatch(sortBatches(study.batches), today);

  return (
    <section data-testid='report-trail' className='mb-4'>
      <BatchTrail progress={study} today={today} />

      {stats && (
        <p
          data-testid='report-stats-caption'
          className='text-muted-foreground text-xs'
        >
          {t('report.stats_caption', {
            batches: stats.batchesCompleted,
            total: stats.totalBatches,
            responses: stats.assessmentsCompleted,
            minutes: stats.timeInvestedMinutes
          })}
        </p>
      )}

      <p
        data-testid='report-next-batch'
        className='text-muted-foreground text-xs'
      >
        {nextBatch
          ? t('report.next_batch_opens', {
              date: formatDay(nextBatch.start) ?? nextBatch.start
            })
          : t('report.last_batch')}
      </p>
    </section>
  );
}
