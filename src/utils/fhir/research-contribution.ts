import {
  bucketResponsesByBatch,
  deduplicateBuckets,
  type ReportResponse
} from './report';
import { extractQuestionnaireId, type StudyProgress } from './research';

/** Response shape with an id so a response is counted once overall. */
export interface ContributionResponse extends ReportResponse {
  id?: string;
}

/** Input for computeGivenTotals. */
export interface GivenTotalsInput {
  studies: readonly StudyProgress[];
  joinedIds: readonly string[];
  responses: readonly ContributionResponse[];
  /** Questionnaire id to estimated minutes (null when unknown). */
  durations: ReadonlyMap<string, number | null>;
}

/** Totals a participant has given across joined studies. */
export interface GivenTotals {
  questionnairesShared: number;
  minutes: number;
  studies: number;
}

/**
 * Computes what a participant has given across joined studies.
 * Each completed response counts once even if it fits several studies.
 *
 * @param input - Studies, joined study ids, responses and durations.
 * @returns Questionnaires shared, minutes and studies with a response.
 */
export function computeGivenTotals(input: GivenTotalsInput): GivenTotals {
  const joined = new Set(input.joinedIds);
  const seen = new Set<ContributionResponse>();
  let studies = 0;
  for (const progress of input.studies) {
    if (!joined.has(progress.study.id ?? '')) continue;
    const deduped = deduplicateBuckets(
      bucketResponsesByBatch(input.responses, progress.batches)
    );
    let any = false;
    for (const list of deduped.values()) {
      for (const response of list) {
        any = true;
        seen.add(response);
      }
    }
    if (any) studies += 1;
  }
  const { count, minutes } = sumUnique(seen, input.durations);
  return { questionnairesShared: count, minutes, studies };
}

/**
 * Counts unique responses and sums their known durations.
 *
 * @param seen - Responses collected across studies.
 * @param durations - Questionnaire id to minutes.
 * @returns Unique count and total minutes.
 */
function sumUnique(
  seen: ReadonlySet<ContributionResponse>,
  durations: ReadonlyMap<string, number | null>
): { count: number; minutes: number } {
  const counted = new Set<string | ContributionResponse>();
  let minutes = 0;
  for (const response of seen) {
    const key = response.id ?? response;
    if (counted.has(key)) continue;
    counted.add(key);
    const qid = extractQuestionnaireId(response.questionnaire);
    minutes += (qid && durations.get(qid)) || 0;
  }
  return { count: counted.size, minutes };
}
