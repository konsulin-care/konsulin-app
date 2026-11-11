'use client';

import {
  GUEST_TITLE,
  getResearchLevelFraction,
  getResearchLevelProgress
} from '@/constants/research';
import { useTranslations } from '@/i18n';
import {
  computeQuestionnaireXp,
  extractQuestionnaireId,
  sortBatches,
  type ResearchBatch
} from '@/utils/fhir/research';
import { batchTimeline, getNextBatch } from '@/utils/fhir/research-schedule';
import type { QuestionnaireResponse } from 'fhir/r4';
import { useMemo } from 'react';

import { baselineCardCount, formatDay } from './batch-meta';

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
  totalXp: number;
  isPatient: boolean;
  latestBatchByQuestionnaire: ReadonlyMap<string, string>;
}

/** The batch announced by the completion headline, its position, and XP. */
interface CompletedBatchSummary {
  batch: ResearchBatch;
  index: number;
  xp: number;
}

/**
 * Picks the batch announced by the completion headline: the participated
 * batch containing today, else the latest participated batch. XP is the
 * distinct questionnaires of that batch at their estimated durations.
 *
 * @param sorted - Batches sorted by start ascending.
 * - participatedIds - Batch ids with at least one response.
 * - buckets - Responses already bucketed per batch.
 * - durationByQuestionnaire - Questionnaire id to estimated minutes.
 * - today - Reference date, yyyy-mm-dd.
 * @returns The summary, or null when nothing was completed.
 */
function completedBatchSummary(
  sorted: readonly ResearchBatch[],
  participatedIds: readonly string[],
  buckets: ReadonlyMap<string, readonly QuestionnaireResponse[]>,
  durationByQuestionnaire: ReadonlyMap<string, number | null>,
  today: string
): CompletedBatchSummary | null {
  const participated = sorted.filter(batch =>
    participatedIds.includes(batch.id)
  );
  const batch =
    participated.find(item => today >= item.start && today <= item.end) ??
    participated.at(-1);
  if (!batch) return null;

  const ids = new Set<string>();
  for (const response of buckets.get(batch.id) ?? []) {
    const questionnaireId = extractQuestionnaireId(response.questionnaire);
    if (questionnaireId) ids.add(questionnaireId);
  }
  return {
    batch,
    index: sorted.findIndex(item => item.id === batch.id) + 1,
    xp: computeQuestionnaireXp([...ids], durationByQuestionnaire)
  };
}

/**
 * Report hero above the participation card: completion headline (with
 * ?completed=1) or study title, level bar for patients, guest claim nudge,
 * batch timeline strip, next-batch line, and a single baseline note.
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
  totalXp,
  isPatient,
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
  const timeline = useMemo(
    () => batchTimeline(sorted, participatedIds, today),
    [sorted, participatedIds, today]
  );
  const nextBatch = useMemo(() => getNextBatch(sorted, today), [sorted, today]);

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
        index: summary.index,
        xp: summary.xp
      })
    : studyTitle;
  const level = getResearchLevelProgress(totalXp);
  const fraction = getResearchLevelFraction(totalXp);
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
        className='text-xl font-bold text-black'
      >
        {headline}
      </h1>

      {isPatient ? (
        <div className='mt-3' data-testid='report-hero-level'>
          <div className='flex items-center justify-between text-xs'>
            <span
              data-testid='report-hero-level-label'
              className='font-bold text-black'
            >
              {level.current.label}
            </span>
            <span data-testid='report-hero-level-xp' className='text-gray-500'>
              {t('report.level_progress', {
                xp: level.toNext,
                level: level.next?.label ?? level.current.label
              })}
            </span>
          </div>
          <div
            data-testid='report-hero-level-bar'
            data-fraction={fraction}
            className='mt-1 h-2 w-full rounded-full bg-gray-200'
          >
            <div
              className='bg-secondary h-2 rounded-full'
              style={{ width: `${Math.round(fraction * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className='bg-secondary/5 mt-3 rounded-xl p-3 text-center'>
          <span
            data-testid='report-hero-title'
            className='text-sm font-bold text-black'
          >
            {GUEST_TITLE.label}
          </span>
          <p
            data-testid='report-claim-nudge'
            className='mt-1 text-xs text-gray-600'
          >
            {t('report.claim_nudge')}
          </p>
        </div>
      )}

      <div
        data-testid='report-hero-timeline'
        className='mt-3 flex items-center gap-1'
      >
        {timeline.map(entry => (
          <span
            key={entry.batch.id}
            data-testid='report-hero-timeline-dot'
            data-batch-id={entry.batch.id}
            data-status={entry.status}
            className='h-2 w-2 shrink-0 rounded-full bg-gray-300'
          />
        ))}
      </div>

      <p
        data-testid='report-hero-next-batch'
        className='mt-2 text-[11px] text-gray-500'
      >
        {nextBatch
          ? t('report.next_batch_opens', {
              date: formatDay(nextBatch.start) ?? nextBatch.start
            })
          : t('report.last_batch')}
      </p>

      {baselineTotal > 0 && (
        <p
          data-testid='report-hero-baseline-note'
          className='mt-2 text-[11px] text-gray-500'
        >
          {t(baselineKey, { count: baselineTotal })}
        </p>
      )}
    </section>
  );
}
