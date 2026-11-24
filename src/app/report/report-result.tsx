'use client';

import { useTranslations } from '@/i18n';
import { interpret, type InstrumentCoding } from '@/lib/interpretation';
import { DEFAULT_REGISTRY } from '@/lib/interpretation/instruments';
import { parseDimensionScores } from '@/utils/fhir/scores';
import type { QuestionnaireResponse } from 'fhir/r4';

/** One questionnaire result rendered by {@link ReportResult}. */
export interface ReportResultItem {
  questionnaireId: string;
  title: string;
  response: QuestionnaireResponse;
  instrument: InstrumentCoding | null;
}

/**
 * Clamp a fraction into the 0-1 range.
 *
 * @param value - Raw fraction, may be negative or above one.
 * @returns The clamped fraction.
 */
function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Normalized bar fraction for a dimension, preferring the instrument scale.
 *
 * @param scale - Matching scale reading, or undefined for unknown instruments.
 * @param raw - Raw dimension score.
 * @param fallback - Pre-normalized fraction from the response parser.
 * @returns A fraction clamped to 0-1.
 */
function barFraction(
  scale: { min: number; max: number } | undefined,
  raw: number,
  fallback: number
): number {
  if (!scale || scale.max <= scale.min) return clampFraction(fallback);
  return clampFraction((raw - scale.min) / (scale.max - scale.min));
}

/** One questionnaire result section with flags, scores and readings. */
function ReportResultSection({ item }: Readonly<{ item: ReportResultItem }>) {
  const t = useTranslations('common');
  const tI = useTranslations('interpretation');
  const dimensions = parseDimensionScores(item.response);
  const reading = interpret(item.response, item.instrument, DEFAULT_REGISTRY);
  const scaleByLinkId = new Map(
    (reading?.scales ?? []).map(scale => [scale.linkId, scale])
  );

  return (
    <section
      data-testid='report-result'
      data-questionnaire-id={item.questionnaireId}
      className='border-border bg-card rounded-xl border p-4'
    >
      <h3 className='text-foreground mb-3 text-sm font-bold'>{item.title}</h3>

      {reading?.flagKeys.map(flagKey => (
        <div
          key={flagKey}
          role='alert'
          data-testid='report-result-flag'
          className='bg-warning-tint text-warning-deep mb-3 rounded-lg p-3 text-sm'
        >
          {tI(flagKey)}
        </div>
      ))}

      <div className='space-y-4'>
        {dimensions.map(dimension => {
          const scale = scaleByLinkId.get(dimension.linkId);
          const fraction = barFraction(scale, dimension.raw, dimension.score);
          const reference = scale?.max ?? dimension.reference;
          return (
            <div key={dimension.linkId} data-link-id={dimension.linkId}>
              <div className='flex items-baseline justify-between gap-2'>
                <span className='text-charcoal-700 text-xs'>
                  {scale ? tI(scale.labelKey) : dimension.name}
                </span>
                <span
                  data-testid='report-result-of'
                  className='text-muted-foreground text-xs'
                >
                  {t('report.score_of', { reference })}
                </span>
              </div>
              <p
                data-testid='report-result-score'
                className='text-foreground text-3xl font-bold'
              >
                {dimension.raw}
              </p>
              <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
                <div
                  data-testid='report-result-bar'
                  data-fraction={fraction}
                  className='bg-charcoal-400 h-full rounded-full'
                  style={{ width: `${fraction * 100}%` }}
                />
              </div>
              {scale?.titleKey && scale.bodyKey && (
                <div
                  data-testid='report-result-reading'
                  className='mt-2 space-y-1'
                >
                  <p className='text-foreground text-sm font-bold'>
                    {tI(scale.titleKey)}
                  </p>
                  <p className='text-muted-foreground text-sm'>
                    {tI(scale.bodyKey)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {reading?.combined && (
        <div data-testid='report-result-combined' className='mt-3 space-y-1'>
          <p className='text-foreground text-sm font-bold'>
            {tI(reading.combined.titleKey)}
          </p>
          <p className='text-muted-foreground text-sm'>
            {tI(reading.combined.bodyKey)}
          </p>
        </div>
      )}

      {reading?.noteKeys.map(noteKey => (
        <p
          key={noteKey}
          data-testid='report-result-note'
          className='text-muted-foreground mt-3 text-xs'
        >
          {tI(noteKey)}
        </p>
      ))}
    </section>
  );
}

/**
 * Result block: one section per questionnaire with interpretation flags,
 * dimension scores, band readings and notes.
 *
 * @param props - Items to render, one per completed questionnaire.
 * @returns The result block.
 */
export function ReportResult({
  items
}: Readonly<{ items: readonly ReportResultItem[] }>) {
  return (
    <div data-testid='report-result-block' className='space-y-4'>
      {items.map(item => (
        <ReportResultSection key={item.questionnaireId} item={item} />
      ))}
    </div>
  );
}
