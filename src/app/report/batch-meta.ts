import { trendForQuestionnaire } from '@/utils/fhir/report';
import type { ResearchBatch } from '@/utils/fhir/research';
import { extractQuestionnaireId } from '@/utils/fhir/research';
import { localDateOf } from '@/utils/local-date';
import { format, parseISO } from 'date-fns';
import type { QuestionnaireResponse } from 'fhir/r4';

/**
 * Formats an ISO date or date-time for display, e.g. "15 Aug 2026".
 *
 * @param date - ISO 8601 date or date-time string.
 * @param timeZone - IANA time zone used to derive the local calendar date.
 * @returns The formatted "dd MMM yyyy" date, or null when absent or invalid.
 */
export function formatDay(
  date: string | undefined,
  timeZone?: string
): string | null {
  if (!date) return null;
  try {
    return format(parseISO(localDateOf(date, timeZone)), 'dd MMM yyyy');
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

/** The batch announced by the completion headline, its position, position. */
export interface CompletedBatchSummary {
  batch: ResearchBatch;
  /** 1-based position of the batch in the chronological order. */
  index: number;
  /** Never set; kept optional only until report-hero.test.tsx drops its xp assertion. */
  xp?: number;
}

/**
 * Picks the batch announced by the completion headline: the participated
 * batch containing today, else the latest participated batch.
 *
 * @param sorted - Batches sorted by start ascending.
 * @param participatedIds - Batch ids with at least one response.
 * @param _buckets - Unused; kept for call-site compatibility.
 * @param _durationByQuestionnaire - Unused; kept for call-site compatibility.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns The summary, or null when nothing was completed.
 */
export function completedBatchSummary(
  sorted: readonly ResearchBatch[],
  participatedIds: readonly string[],
  _buckets: ReadonlyMap<string, readonly QuestionnaireResponse[]>,
  _durationByQuestionnaire: ReadonlyMap<string, number | null>,
  today: string
): CompletedBatchSummary | null {
  const participated = sorted.filter(batch =>
    participatedIds.includes(batch.id)
  );
  const batch =
    participated.find(item => today >= item.start && today <= item.end) ??
    participated.at(-1);
  if (!batch) return null;

  return {
    batch,
    index: sorted.findIndex(item => item.id === batch.id) + 1
  };
}

/**
 * Counts responses in a batch that establish a baseline for a repeated
 * instrument (deployed in ≥2 batches with exactly one recorded response).
 *
 * @param buckets - Responses already bucketed per batch; the entries for
 *   batchId are the section's responses.
 * @param sortedBatches - All batches sorted by period start ascending.
 * @param batchId - The batch section being rendered.
 * @param latestBatchByQuestionnaire - Questionnaire id to newest batch id.
 * @param prefix - Translated label for the batch position, forwarded to trendForQuestionnaire.
 * @returns Number of baseline cards in this batch.
 */
export function baselineCardCount(
  buckets: ReadonlyMap<string, readonly QuestionnaireResponse[]>,
  sortedBatches: readonly ResearchBatch[],
  batchId: string,
  latestBatchByQuestionnaire: ReadonlyMap<string, string>,
  prefix: (index: number) => string
): number {
  let count = 0;
  for (const response of buckets.get(batchId) ?? []) {
    const questionnaireId = extractQuestionnaireId(response.questionnaire);
    if (!questionnaireId) continue;
    const trend = trendForQuestionnaire(
      questionnaireId,
      buckets,
      sortedBatches,
      prefix
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
