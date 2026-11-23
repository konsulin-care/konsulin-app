'use client';

import { Progress } from '@/components/ui/progress';
import { useTranslations } from '@/i18n';
import { TOKENS } from '@/styles/tokens';
import {
  trendDirection,
  trendForQuestionnaire,
  type TrendDirection
} from '@/utils/fhir/report';
import { parseDimensionScores } from '@/utils/fhir/scores';
import type { QuestionnaireResponse } from 'fhir/r4';
import { useMemo } from 'react';

import { formatDay } from './batch-meta';

/** One neutral color for every score bar on report cards. */
const NEUTRAL_SCORE_COLOR = TOKENS.charcoal400;

/** Neutral glyph per trend direction; arrows only, no valence. */
const DIRECTION_GLYPH = {
  up: '▲',
  down: '▼',
  same: '='
} as const satisfies Record<TrendDirection, string>;

/** i18n key per trend direction for the delta marker's aria-label. */
const DIRECTION_LABEL_KEY = {
  up: 'report.trend_up',
  down: 'report.trend_down',
  same: 'report.trend_same'
} as const satisfies Record<TrendDirection, string>;

/** One completed questionnaire card within a batch section. */
export function QuestionnaireCard({
  questionnaireId,
  title,
  response,
  batchId,
  latestBatchId,
  trend,
  hideAuthored = false,
  baselineCompareLabel = null
}: Readonly<{
  questionnaireId: string;
  title: string;
  response: QuestionnaireResponse;
  batchId: string;
  latestBatchId: string | undefined;
  trend: ReturnType<typeof trendForQuestionnaire>;
  hideAuthored?: boolean;
  /** Label of the next batch repeating this questionnaire, when any. */
  baselineCompareLabel?: string | null;
}>) {
  const t = useTranslations('common');
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
      className='border-border bg-card rounded-xl border p-4'
    >
      <div className='mb-2 flex items-baseline justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <h3 className='text-foreground text-sm font-bold'>{title}</h3>
          {isLatestCard && trend.kind === 'baseline' && (
            <span
              data-testid='report-baseline-badge'
              className='bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-semibold'
            >
              {baselineCompareLabel
                ? t('report.baseline_compare', { batch: baselineCompareLabel })
                : t('report.baseline')}
            </span>
          )}
        </div>
        {authored && !hideAuthored && (
          <span className='text-muted-foreground text-xs'>
            {t('report.completed', { date: authored })}
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
              className='text-charcoal-700 text-xs text-wrap break-words'
            >
              {dimension.name}
            </span>
            <Progress value={dimension.score} color={NEUTRAL_SCORE_COLOR} />
            <span
              data-testid='report-dimension-value'
              className='text-muted-foreground text-xs'
            >
              {dimension.raw}/{dimension.reference}
            </span>
          </div>
        ))}
      </div>

      {isLatestCard && trend.kind === 'trend' && trend.rows[0] && (
        <div
          data-testid='report-trend'
          className='border-border mt-4 border-t pt-3'
        >
          <p className='text-muted-foreground mb-2 text-xs font-bold uppercase'>
            {t('report.score_history')}
          </p>
          {trend.rows[0].dimensions.map(dimension => (
            <div key={dimension.name} className='mb-2'>
              <span className='text-charcoal-700 text-xs font-bold'>
                {dimension.name}
              </span>
              <div className='mt-1 space-y-1'>
                {trend.rows.map((row, index) => {
                  const rowDimension = row.dimensions.find(
                    item => item.name === dimension.name
                  );
                  const latest = row.batchId === batchId;
                  const previousDimension =
                    index > 0
                      ? trend.rows[index - 1]?.dimensions.find(
                          item => item.name === dimension.name
                        )
                      : undefined;
                  const direction =
                    rowDimension && previousDimension
                      ? trendDirection(previousDimension.raw, rowDimension.raw)
                      : null;
                  return (
                    <div
                      key={row.batchId}
                      data-testid='report-trend-row'
                      data-batch-id={row.batchId}
                      data-latest={String(latest)}
                      className={`grid grid-cols-[110px_1fr_auto_auto] items-center gap-2 ${
                        latest ? 'font-bold' : 'opacity-70'
                      }`}
                    >
                      <span className='text-muted-foreground text-xs'>
                        {row.label}
                      </span>
                      {rowDimension && (
                        <Progress
                          value={rowDimension.score}
                          color={NEUTRAL_SCORE_COLOR}
                        />
                      )}
                      <span className='text-muted-foreground text-xs'>
                        {rowDimension
                          ? `${rowDimension.raw}/${rowDimension.reference}`
                          : '—'}
                      </span>
                      {direction ? (
                        <span
                          data-testid='report-trend-delta'
                          data-direction={direction}
                          role='img'
                          aria-label={t(DIRECTION_LABEL_KEY[direction])}
                          className='text-muted-foreground text-xs'
                        >
                          {DIRECTION_GLYPH[direction]}
                        </span>
                      ) : (
                        <span aria-hidden='true' />
                      )}
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
