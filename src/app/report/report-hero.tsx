'use client';

import { useTranslations } from '@/i18n';
import { sortBatches, type ResearchBatch } from '@/utils/fhir/research';
import type { QuestionnaireResponse } from 'fhir/r4';
import { useMemo } from 'react';

import { baselineCardCount, completedBatchSummary } from './batch-meta';

/** Props for the report hero. */
export interface ReportHeroProps {
  studyTitle: string;
  /** True when the URL carries ?completed=1 (batch-completion headline). */
  completed: boolean;
  /** Reference date, yyyy-mm-dd. */
  today: string;
  batches: readonly ResearchBatch[];
  buckets: ReadonlyMap<string, readonly QuestionnaireResponse[]>;
  durationByQuestionnaire: ReadonlyMap<string, number | null>;
  /** @deprecated Unused; kept until hero test fixtures drop it. */
  totalXp?: number;
  isPatient: boolean;
  latestBatchByQuestionnaire: ReadonlyMap<string, string>;
}

/**
 * Report hero above the participation card: completion headline (with
 * ?completed=1) or study title, level bar for patients, and a single
 * baseline note. The trail and the guest save card live below.
 *
 * @param props - Study title, completion flag, reference date, batches,
 *   response buckets, duration map, global XP, patient flag, and the
 *   latest-batch anchor per questionnaire.
 * @returns The hero section.
 */
export function ReportHero({
  studyTitle,
  completed,
  today,
  batches,
  buckets,
  durationByQuestionnaire,
  latestBatchByQuestionnaire
}: Readonly<ReportHeroProps>) {
  const t = useTranslations('common');

  const sorted = useMemo(() => sortBatches([...batches]), [batches]);
  const participatedIds = useMemo(
    () =>
      sorted
        .filter(batch => (buckets.get(batch.id)?.length ?? 0) > 0)
        .map(batch => batch.id),
    [sorted, buckets]
  );
  const summary = useMemo(
    () =>
      completedBatchSummary(
        sorted,
        participatedIds,
        buckets,
        durationByQuestionnaire,
        today
      ),
    [sorted, participatedIds, buckets, durationByQuestionnaire, today]
  );

  const baselineTotal = useMemo(() => {
    const prefix = (index: number): string =>
      t('report.batch_prefix', { index });
    return sorted.reduce(
      (sum, batch) =>
        sum +
        baselineCardCount(
          buckets,
          sorted,
          batch.id,
          latestBatchByQuestionnaire,
          prefix
        ),
      0
    );
  }, [sorted, buckets, latestBatchByQuestionnaire, t]);

  const showHeadline = completed && summary !== null;
  const headline = showHeadline
    ? t('report.batch_done', {
        index: summary.index
      })
    : studyTitle;
  const baselineKey =
    baselineTotal === 1
      ? 'report.baseline_note_one'
      : 'report.baseline_note_other';

  return (
    <section data-testid='report-hero' className='mb-4'>
      <h1
        data-testid={
          showHeadline ? 'report-hero-headline' : 'report-study-title'
        }
        className='text-foreground text-xl font-bold'
      >
        {headline}
      </h1>

      {baselineTotal > 0 && (
        <p
          data-testid='report-hero-baseline-note'
          className='text-muted-foreground mt-2 text-xs'
        >
          {t(baselineKey, { count: baselineTotal })}
        </p>
      )}
    </section>
  );
}
