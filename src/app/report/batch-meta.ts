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
 * Copy for the batch-level baseline note, pluralized by card count.
 *
 * @param count - Number of baseline cards in the batch.
 * @returns The note sentence, e.g. "... for 2 assessments ...".
 */
export function baselineNoteText(count: number): string {
  const unit = count === 1 ? 'assessment' : 'assessments';
  return `Baseline scores recorded for ${count} ${unit} for future comparison`;
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
