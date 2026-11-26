import type { ResearchBatch } from '@/utils/fhir/research';

/** Minimal study shape needed for batch facts. */
export interface StudyBatchInfo {
  batches: ResearchBatch[];
  currentBatch?: ResearchBatch | null;
}

export type StudyKind =
  { kind: 'one-time' } | { kind: 'repeated'; index: number; total: number };

export type GetBackItem = 'personal' | 'comparison' | 'findings';

/**
 * Sums estimated minutes for a batch's questionnaires.
 * @param batch - batch with questionnaire ids
 * @param durations - minutes by questionnaire id
 * @returns total minutes, or undefined when any duration is unknown
 */
export function timeNeeded(
  batch: Pick<ResearchBatch, 'questionnaireIds'>,
  durations: Record<string, number | undefined>
): number | undefined {
  let total = 0;
  for (const id of batch.questionnaireIds) {
    const minutes = durations[id];
    if (minutes === undefined) return undefined;
    total += minutes;
  }
  return total;
}

/**
 * Classifies a study as one-time or repeated.
 * @param study - study with batches and optional current batch
 * @returns one-time, or repeated with 1-based batch index and total
 */
export function studyKind(study: StudyBatchInfo): StudyKind {
  const total = study.batches.length;
  if (total <= 1) return { kind: 'one-time' };
  const current = study.currentBatch;
  const found = current
    ? study.batches.findIndex(b => b.id === current.id)
    : -1;
  return { kind: 'repeated', index: found + 1, total };
}

/**
 * Lists what a participant gets back from a study.
 * @param study - study with batches
 * @param profile - profile with sharesFindings flag
 * @returns item keys in display order
 */
export function getBackItems(
  study: StudyBatchInfo,
  profile: { sharesFindings: boolean }
): GetBackItem[] {
  const items: GetBackItem[] = ['personal'];
  if (study.batches.length > 1) items.push('comparison');
  if (profile.sharesFindings) items.push('findings');
  return items;
}
