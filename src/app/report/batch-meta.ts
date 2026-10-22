import { trendForQuestionnaire } from '@/utils/fhir/report';
import type { ResearchBatch } from '@/utils/fhir/research';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import { format, parseISO } from 'date-fns';
import type { QuestionnaireResponse } from 'fhir/r4';

/** Formats a yyyy-mm-dd date for display, e.g. "15 Aug 2026". */
export function formatDay(date: string | undefined): string | null {
  if (!date) return null;
  try {
    return format(parseISO(date.slice(0, 10)), 'dd MMM yyyy');
  } catch {
    return null;
  }
}

/**
 * Compact batch title for a report header, e.g. "Batch 2: 01 - 31 Aug 2026".
 *
 * Same-month windows collapse into "dd - dd MMM yyyy"; cross-month windows
 * fall back to a full "dd MMM yyyy - dd MMM yyyy" range. Position comes from
 * the batch's index in the study's chronological order. The "Batch N" prefix
 * is supplied already translated by the caller.
 *
 * @param batch - The batch to title.
 * @param sorted - All batches sorted by period start ascending.
 * @param prefix - Translated label for the batch position, e.g. index => "Batch {index}".
 * @returns The header title, e.g. "Batch 2: 01 - 31 Aug 2026".
 */
export function batchTitle(
  batch: ResearchBatch,
  sorted: readonly ResearchBatch[],
  prefix: (index: number) => string
): string {
  const index = sorted.findIndex(item => item.id === batch.id) + 1;
  const start = parseISO(batch.start);
  const end = parseISO(batch.end);
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();
  const range = sameMonth
    ? `${format(start, 'dd')} - ${format(end, 'dd MMM yyyy')}`
    : `${format(start, 'dd MMM yyyy')} - ${format(end, 'dd MMM yyyy')}`;
  return `${prefix(index)}: ${range}`;
}

/**
 * Shared formatted completion date when every renderable response in a batch
 * carries the same authored date; otherwise null (mixed or missing dates).
 *
 * @param responses - Responses rendered within one batch section.
 * @returns The shared "dd MMM yyyy" date, or null.
 */
export function sharedAuthoredDate(
  responses: readonly QuestionnaireResponse[]
): string | null {
  const dates = responses
    .filter(response => extractQuestionnaireId(response.questionnaire) !== null)
    .map(response => formatDay(response.authored));
  return dates.length > 0 &&
    dates.every(date => date !== null) &&
    new Set(dates).size === 1
    ? (dates[0] ?? null)
    : null;
}

/**
 * Counts responses in a batch that establish a baseline for a repeated
 * instrument (deployed in ≥2 batches with exactly one recorded response).
 *
 * @param responses - Responses rendered within one batch section.
 * @param buckets - Responses already bucketed per batch.
 * @param sortedBatches - All batches sorted by period start ascending.
 * @param batchId - The batch section being rendered.
 * @param latestBatchByQuestionnaire - Questionnaire id to newest batch id.
 * @returns Number of baseline cards in this batch.
 */
export function baselineCardCount(
  responses: readonly QuestionnaireResponse[],
  buckets: ReadonlyMap<string, readonly QuestionnaireResponse[]>,
  sortedBatches: readonly ResearchBatch[],
  batchId: string,
  latestBatchByQuestionnaire: ReadonlyMap<string, string>
): number {
  let count = 0;
  for (const response of responses) {
    const questionnaireId = extractQuestionnaireId(response.questionnaire);
    if (!questionnaireId) continue;
    const trend = trendForQuestionnaire(
      questionnaireId,
      buckets,
      sortedBatches
    );
    if (
      trend.kind === 'baseline' &&
      latestBatchByQuestionnaire.get(questionnaireId) === batchId
    ) {
      count += 1;
    }
  }
  return count;
}
