import type { ResearchBatch } from './research';

/** Catalogue status of a study for one participant. */
export type StudyStatus =
  | 'open'
  | 'needs-you'
  | 'shared-this-batch'
  | 'waiting-next-batch'
  | 'waiting-sync'
  | 'closed';

/** Study projection needed to compute status. */
export interface StatusStudy {
  batches: readonly ResearchBatch[];
  /** Ids of batches the participant has already answered on the server. */
  participatedBatchIds: readonly string[];
}

/** Inputs of {@link studyStatus}. */
export interface StudyStatusInput {
  study: StatusStudy;
  joined: boolean;
  /** Ids of batches completed only by queued (unsynced) answers. */
  waitingIds: ReadonlySet<string>;
  /** Reference date, yyyy-mm-dd. */
  today: string;
}

/** Result of {@link studyStatus}. */
export interface StudyStatusResult {
  status: StudyStatus;
  /** Start of the next batch, yyyy-mm-dd; set when waiting for next batch. */
  nextBatchStart?: string;
}

/**
 * Computes the participant-facing status of a study.
 *
 * @param input - Study, join flag, queued batch ids and today (yyyy-mm-dd).
 * @returns The status, plus nextBatchStart when waiting for the next batch.
 */
export function studyStatus(input: StudyStatusInput): StudyStatusResult {
  const { study, joined, waitingIds, today } = input;
  const sorted = [...study.batches].toSorted((a, b) =>
    a.start.localeCompare(b.start)
  );
  const current = sorted.find(b => b.start <= today && today <= b.end);
  const next = sorted.find(b => b.start > today);
  if (!joined) {
    return { status: current || next ? 'open' : 'closed' };
  }
  if (current) {
    if (study.participatedBatchIds.includes(current.id)) {
      return { status: 'shared-this-batch' };
    }
    if (waitingIds.has(current.id)) return { status: 'waiting-sync' };
    return { status: 'needs-you' };
  }
  if (next) {
    return { status: 'waiting-next-batch', nextBatchStart: next.start };
  }
  return { status: 'closed' };
}
