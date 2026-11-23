import { format, parseISO } from 'date-fns';
import { questionnaireIdOf } from './questionnaire-url';
import type { ResearchBatch } from './research';

/** Timeline status of one batch relative to today. */
export type BatchTimelineStatus = 'done' | 'missed' | 'current' | 'upcoming';

/** Minimal response projection used to find the batch awaiting sync. */
export interface WaitingResponse {
  /** Questionnaire reference, canonical URL, or bare id. */
  questionnaire?: string;
  /** ISO authored timestamp. */
  authored?: string;
}

/** One entry of the batch timeline: the batch, its 1-based position, and status. */
export interface BatchTimelineEntry {
  batch: ResearchBatch;
  /** 1-based position in the start-ascending order. */
  index: number;
  status: BatchTimelineStatus;
}

/**
 * Sorts batches by window start ascending without mutating the input.
 *
 * @param batches - Batches to sort, in any order.
 * @returns A new array ordered by start.
 */
function sortBatches(batches: readonly ResearchBatch[]): ResearchBatch[] {
  return [...batches].toSorted((a, b) => a.start.localeCompare(b.start));
}

/**
 * Returns the earliest batch that starts after the given date, or null when
 * none does. String comparison is chronological for yyyy-mm-dd dates.
 *
 * @param batches - Batches to search, in any order.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns The next batch by start, or null.
 */
export function getNextBatch(
  batches: readonly ResearchBatch[],
  today: string
): ResearchBatch | null {
  return sortBatches(batches).find(batch => batch.start > today) ?? null;
}

/**
 * Returns the earliest batch starting after `afterStart` that deploys the
 * given questionnaire, or null when no later batch includes it.
 *
 * @param batches - Batches to search, in any order.
 * @param questionnaireId - Bare questionnaire id to match.
 * @param afterStart - Exclusive lower bound on batch start, yyyy-mm-dd.
 * @returns The next matching batch, or null.
 */
export function nextBatchWithQuestionnaire(
  batches: readonly ResearchBatch[],
  questionnaireId: string,
  afterStart: string
): ResearchBatch | null {
  return (
    sortBatches(batches).find(
      batch =>
        batch.start > afterStart &&
        batch.questionnaireIds.includes(questionnaireId)
    ) ?? null
  );
}

/**
 * Classifies one batch against today and participation.
 *
 * @param batch - Batch to classify.
 * @param participated - Set of batch ids with responses.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns The timeline status.
 */
function statusOf(
  batch: ResearchBatch,
  participated: ReadonlySet<string>,
  today: string
): BatchTimelineStatus {
  if (today > batch.end) {
    return participated.has(batch.id) ? 'done' : 'missed';
  }
  if (today >= batch.start) return 'current';
  return 'upcoming';
}

/**
 * Collects the ids of batches that are waiting to sync: for each queued
 * response, the batch whose window contains the authored day and that deploys
 * the response's questionnaire. Entries missing a questionnaire or an authored
 * date, or matching no batch, are skipped.
 *
 * @param batches - Batches of a study, in any order.
 * @param waiting - Queued responses awaiting sync.
 * @returns Ids of batches with at least one waiting response.
 */
export function waitingBatchIds(
  batches: readonly ResearchBatch[],
  waiting: readonly WaitingResponse[]
): Set<string> {
  const ids = new Set<string>();
  for (const response of waiting) {
    const questionnaireId = questionnaireIdOf(response.questionnaire);
    if (!questionnaireId || !response.authored) continue;
    const day = format(parseISO(response.authored), 'yyyy-MM-dd');
    const match = batches.find(
      batch =>
        batch.start <= day &&
        day <= batch.end &&
        batch.questionnaireIds.includes(questionnaireId)
    );
    if (match) ids.add(match.id);
  }
  return ids;
}

/**
 * Builds the batch timeline: entries sorted by start ascending with 1-based
 * indexes. A past batch is `done` when it has responses (its id is in
 * `participatedBatchIds`) and `missed` otherwise; the batch containing today
 * is `current`; later batches are `upcoming`.
 *
 * @param batches - Batches of a study, in any order.
 * @param participatedBatchIds - Batch ids with at least one response.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns Timeline entries in start order.
 */
export function batchTimeline(
  batches: readonly ResearchBatch[],
  participatedBatchIds: readonly string[],
  today: string
): BatchTimelineEntry[] {
  const participated = new Set(participatedBatchIds);
  return sortBatches(batches).map((batch, index) => ({
    batch,
    index: index + 1,
    status: statusOf(batch, participated, today)
  }));
}
