'use client';

import type { QuestionnaireInfo } from '@/services/api/research';
import {
  trendForQuestionnaire,
  type ParticipationStats
} from '@/utils/fhir/report';
import type { ResearchBatch } from '@/utils/fhir/research';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import type { QuestionnaireResponse } from 'fhir/r4';

import {
  baselineCardCount,
  baselineNoteText,
  batchTitle,
  sharedAuthoredDate
} from './batch-meta';
import { QuestionnaireCard } from './questionnaire-card';

/** Nudge shown to guests in place of score history. */
export const CLAIM_REPORT_NUDGE =
  'Claim this report to unlock score history record';

/** Static mental-health disclosure for the report footer. */
export const REPORT_DISCLAIMER =
  'These scores are screening results for research purposes only and are not a medical diagnosis. If you are feeling distressed, please reach out to a qualified professional.';

/** Participation summary card with the aggregate stats. */
export function ParticipationCard({
  stats
}: Readonly<{ stats: ParticipationStats }>) {
  return (
    <section
      data-testid='report-participation-card'
      className='card mb-4 border-0 bg-[#F9F9F9] p-4'
    >
      <div className='grid grid-cols-2 gap-3 text-xs text-gray-600'>
        <div>
          <p className='text-[11px] text-gray-400'>Assessments completed</p>
          <p
            data-testid='report-stat-assessments'
            className='font-bold text-black'
          >
            {stats.assessmentsCompleted}
          </p>
        </div>
        <div>
          <p className='text-[11px] text-gray-400'>Batches completed</p>
          <p data-testid='report-stat-batches' className='font-bold text-black'>
            {stats.batchesCompleted}/{stats.totalBatches}
          </p>
        </div>
        {stats.consecutiveBatches > 1 && (
          <div>
            <p className='text-[11px] text-gray-400'>Streak</p>
            <p
              data-testid='report-stat-streak'
              className='font-bold text-black'
            >
              {stats.consecutiveBatches} batches
            </p>
          </div>
        )}
        <div>
          <p className='text-[11px] text-gray-400'>XP earned</p>
          <p data-testid='report-stat-xp' className='font-bold text-black'>
            {stats.xp}
          </p>
        </div>
        <div>
          <p className='text-[11px] text-gray-400'>Time invested</p>
          <p data-testid='report-stat-time' className='font-bold text-black'>
            ~{stats.timeInvestedMinutes} min
          </p>
        </div>
      </div>
    </section>
  );
}

/** One reverse-chronological batch section: header plus questionnaire cards. */
export function BatchSection({
  batch,
  sortedBatches,
  responses,
  titleMap,
  buckets,
  latestBatchByQuestionnaire
}: Readonly<{
  batch: ResearchBatch;
  sortedBatches: readonly ResearchBatch[];
  responses: readonly QuestionnaireResponse[];
  titleMap: Readonly<Record<string, QuestionnaireInfo>>;
  buckets: ReadonlyMap<string, readonly QuestionnaireResponse[]>;
  latestBatchByQuestionnaire: ReadonlyMap<string, string>;
}>) {
  const sharedDate = sharedAuthoredDate(responses);
  const baselineCount = baselineCardCount(
    responses,
    buckets,
    sortedBatches,
    batch.id,
    latestBatchByQuestionnaire
  );

  return (
    <section
      data-testid='report-batch-section'
      data-batch-id={batch.id}
      className='mb-5'
    >
      <div data-testid='report-batch-header' className='mb-2'>
        <p className='text-sm font-bold text-black'>
          {batchTitle(batch, sortedBatches)}
        </p>
        {sharedDate && (
          <p className='text-[11px] text-gray-500'>Completed at {sharedDate}</p>
        )}
      </div>

      {baselineCount > 0 && (
        <p
          data-testid='report-baseline-note'
          className='mb-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500'
        >
          {baselineNoteText(baselineCount)}
        </p>
      )}

      <div className='space-y-2'>
        {responses.map(response => {
          const questionnaireId = extractQuestionnaireId(
            response.questionnaire
          );
          if (!questionnaireId) return null;
          const trend = trendForQuestionnaire(
            questionnaireId,
            buckets,
            sortedBatches
          );
          return (
            <QuestionnaireCard
              key={response.id}
              questionnaireId={questionnaireId}
              title={titleMap[questionnaireId]?.title ?? questionnaireId}
              response={response}
              batchId={batch.id}
              latestBatchId={latestBatchByQuestionnaire.get(questionnaireId)}
              trend={trend}
              hideAuthored={sharedDate !== null}
            />
          );
        })}
      </div>
    </section>
  );
}
