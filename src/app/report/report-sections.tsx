'use client';

import { Progress } from '@/components/ui/progress';
import type { QuestionnaireInfo } from '@/services/api/research';
import {
  batchLabel,
  trendForQuestionnaire,
  type ParticipationStats
} from '@/utils/fhir/report';
import type { ResearchBatch, StudyProgress } from '@/utils/fhir/research';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import { getScoreColor, parseDimensionScores } from '@/utils/fhir/scores';
import { format, parseISO } from 'date-fns';
import type { QuestionnaireResponse } from 'fhir/r4';
import { useMemo } from 'react';

/** Nudge shown to guests in place of score history. */
export const CLAIM_REPORT_NUDGE =
  'Claim this report to unlock score history record';

/** Static mental-health disclosure for the report footer. */
export const REPORT_DISCLAIMER =
  'These scores are screening results for research purposes only and are not a medical diagnosis. If you are feeling distressed, please reach out to a qualified professional.';

/** Formats a yyyy-mm-dd date for display, e.g. "15 Aug 2026". */
export function formatDay(date: string | undefined): string | null {
  if (!date) return null;
  try {
    return format(parseISO(date.slice(0, 10)), 'dd MMM yyyy');
  } catch {
    return null;
  }
}

/** Overall study status for the report header badge. */
export function studyStatus(study: StudyProgress): string {
  if (!study.currentBatch) return 'Study complete';
  if (study.isComplete) return 'Batch complete';
  return 'In progress';
}

/** One completed questionnaire card within a batch section. */
export function QuestionnaireCard({
  questionnaireId,
  title,
  response,
  batchId,
  latestBatchId,
  trend
}: Readonly<{
  questionnaireId: string;
  title: string;
  response: QuestionnaireResponse;
  batchId: string;
  latestBatchId: string | undefined;
  trend: ReturnType<typeof trendForQuestionnaire>;
}>) {
  const dimensions = useMemo(
    () =>
      [...parseDimensionScores(response)].toSorted(
        (a, b) => b.percentage - a.percentage
      ),
    [response]
  );
  const authored = formatDay(response.authored);
  const isLatestCard = latestBatchId === batchId;

  return (
    <article
      data-testid={`report-questionnaire-card-${questionnaireId}`}
      className='rounded-xl border border-gray-100 bg-white p-4'
    >
      <div className='mb-2 flex items-baseline justify-between gap-2'>
        <h3 className='text-sm font-bold text-black'>{title}</h3>
        {authored && (
          <span className='text-[11px] text-gray-500'>
            Completed {authored}
          </span>
        )}
      </div>

      <div className='space-y-2'>
        {dimensions.map(dimension => (
          <div
            key={dimension.name}
            className='grid grid-cols-[110px_1fr_auto] items-center gap-2'
          >
            <span
              data-testid='report-dimension-name'
              className='text-xs text-wrap break-words text-gray-700'
            >
              {dimension.name}
            </span>
            <Progress
              value={dimension.score}
              color={getScoreColor(dimension.name)}
            />
            <span className='text-xs text-gray-600'>
              {dimension.raw}/{dimension.reference} · {dimension.percentage}%
            </span>
          </div>
        ))}
      </div>

      {isLatestCard && trend.kind === 'trend' && trend.rows[0] && (
        <div
          data-testid='report-trend'
          className='mt-4 border-t border-gray-100 pt-3'
        >
          <p className='mb-2 text-[11px] font-bold text-gray-500 uppercase'>
            Score history
          </p>
          {trend.rows[0].dimensions.map(dimension => (
            <div key={dimension.name} className='mb-2'>
              <span className='text-xs font-bold text-gray-700'>
                {dimension.name}
              </span>
              <div className='mt-1 space-y-1'>
                {trend.rows.map(row => {
                  const rowDimension = row.dimensions.find(
                    item => item.name === dimension.name
                  );
                  const latest = row.batchId === batchId;
                  return (
                    <div
                      key={row.batchId}
                      data-testid='report-trend-row'
                      data-batch-id={row.batchId}
                      data-latest={String(latest)}
                      className={`grid grid-cols-[110px_1fr_auto] items-center gap-2 ${
                        latest ? 'font-bold' : 'opacity-70'
                      }`}
                    >
                      <span className='text-[11px] text-gray-500'>
                        {row.label}
                      </span>
                      {rowDimension && (
                        <Progress
                          value={rowDimension.score}
                          color={getScoreColor(rowDimension.name)}
                        />
                      )}
                      <span className='text-[11px] text-gray-600'>
                        {rowDimension
                          ? `${rowDimension.raw}/${rowDimension.reference} ${rowDimension.percentage}%`
                          : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {isLatestCard && trend.kind === 'baseline' && (
        <p
          data-testid='report-baseline-teaser'
          className='mt-3 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500'
        >
          Baseline recorded as comparison to future trend
        </p>
      )}
    </article>
  );
}

/** Participation summary card with the six aggregate stats. */
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
        {stats.firstParticipationDate && (
          <div>
            <p className='text-[11px] text-gray-400'>First participation</p>
            <p data-testid='report-stat-first' className='font-bold text-black'>
              {formatDay(stats.firstParticipationDate)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/** One reverse-chronological batch section: header plus questionnaire cards. */
export function BatchSection({
  batch,
  sortedBatches,
  responses,
  currentBatchId,
  titleMap,
  buckets,
  latestBatchByQuestionnaire
}: Readonly<{
  batch: ResearchBatch;
  sortedBatches: readonly ResearchBatch[];
  responses: readonly QuestionnaireResponse[];
  currentBatchId: string | null;
  titleMap: Readonly<Record<string, QuestionnaireInfo>>;
  buckets: ReadonlyMap<string, readonly QuestionnaireResponse[]>;
  latestBatchByQuestionnaire: ReadonlyMap<string, string>;
}>) {
  const completed = new Set(
    responses
      .map(response => extractQuestionnaireId(response.questionnaire))
      .filter((id): id is string => id !== null)
  ).size;
  const status = currentBatchId === batch.id ? 'In progress' : 'Closed';

  return (
    <section
      data-testid='report-batch-section'
      data-batch-id={batch.id}
      className='mb-5'
    >
      <div
        data-testid='report-batch-header'
        className='mb-2 flex items-center justify-between'
      >
        <div>
          <p className='text-sm font-bold text-black'>
            {batchLabel(batch, sortedBatches)}
          </p>
          <p className='text-[11px] text-gray-500'>
            {formatDay(batch.start)} – {formatDay(batch.end)}
          </p>
        </div>
        <div className='text-right'>
          <p className='text-[11px] text-gray-500'>
            {completed}/{batch.questionnaireIds.length} assessments
          </p>
          <p className='text-[11px] font-bold text-gray-600'>{status}</p>
        </div>
      </div>

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
            />
          );
        })}
      </div>
    </section>
  );
}
