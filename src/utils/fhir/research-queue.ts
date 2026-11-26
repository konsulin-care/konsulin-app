import type { StudyProgress } from './research';

/** One questionnaire to answer next, merged across joined studies. */
export interface UpNextItem {
  questionnaireId: string;
  /** Every joined study this questionnaire counts toward. */
  studies: StudyProgress[];
  /** Study whose batch closes first. */
  leadStudy: StudyProgress;
  /** Earliest batch end, yyyy-mm-dd. */
  closesOn: string;
}

/** Input of buildUpNextQueue. */
export interface UpNextInput {
  studies: readonly StudyProgress[];
  joinedIds: readonly string[];
  /** Questionnaire ids queued offline; treated as answered. */
  waitingIds: readonly string[];
  /** Reference date, yyyy-mm-dd. */
  today: string;
}

/**
 * Returns the title of a study progress entry.
 *
 * @param progress - Study progress.
 * @returns The title or an empty string.
 */
function titleOf(progress: StudyProgress): string {
  return progress.study.title ?? '';
}

/**
 * Adds a study to the item of a questionnaire, creating it if needed.
 *
 * @param items - Items by questionnaire id.
 * @param qid - Questionnaire id.
 * @param progress - Study progress to add.
 * @param end - Batch end of that study.
 */
function mergeItem(
  items: Map<string, UpNextItem>,
  qid: string,
  progress: StudyProgress,
  end: string
): void {
  const existing = items.get(qid);
  if (!existing) {
    items.set(qid, {
      questionnaireId: qid,
      studies: [progress],
      leadStudy: progress,
      closesOn: end
    });
    return;
  }
  existing.studies.push(progress);
  if (end < existing.closesOn) {
    existing.closesOn = end;
    existing.leadStudy = progress;
  }
}

/**
 * Builds the up-next queue: unanswered questionnaires of open batches in
 * joined studies, merged by questionnaire id and sorted by closing date,
 * then study count descending, then lead study title.
 *
 * @param input - Studies, joined ids, offline-queued questionnaire ids, today.
 * @returns Queue items in display order.
 */
export function buildUpNextQueue(input: UpNextInput): UpNextItem[] {
  const waiting = new Set(input.waitingIds);
  const items = new Map<string, UpNextItem>();
  for (const progress of input.studies) {
    const batch = progress.currentBatch;
    if (!batch || !input.joinedIds.includes(progress.study.id ?? '')) continue;
    if (input.today < batch.start || input.today > batch.end) continue;
    const done = new Set(progress.completedQuestionnaireIds);
    for (const qid of batch.questionnaireIds) {
      if (done.has(qid) || waiting.has(qid)) continue;
      mergeItem(items, qid, progress, batch.end);
    }
  }
  return [...items.values()].toSorted(
    (a, b) =>
      a.closesOn.localeCompare(b.closesOn) ||
      b.studies.length - a.studies.length ||
      titleOf(a.leadStudy).localeCompare(titleOf(b.leadStudy))
  );
}
