'use client';

import { Progress } from '@/components/ui/progress';
import { trendForQuestionnaire } from '@/utils/fhir/report';
import { getScoreColor, parseDimensionScores } from '@/utils/fhir/scores';
import type { QuestionnaireResponse } from 'fhir/r4';
import { useMemo } from 'react';

import { formatDay } from './batch-meta';

/** One completed questionnaire card within a batch section. */
export function QuestionnaireCard({
  questionnaireId,
  title,
  response,
  batchId,
  latestBatchId,
  trend,
  hideAuthored = false
}: Readonly<{
  questionnaireId: string;
  title: string;
  response: QuestionnaireResponse;
  batchId: string;
  latestBatchId: string | undefined;
  trend: ReturnType<typeof trendForQuestionnaire>;
  hideAuthored?: boolean;
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
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-bold text-black'>{title}</h3>
          {isLatestCard && trend.kind === 'baseline' && (
            <span
              data-testid='report-baseline-badge'
              className='rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600'
            >
              Baseline
            </span>
          )}
        </div>
        {authored && !hideAuthored && (
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
    </article>
  );
}
