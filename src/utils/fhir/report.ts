import { format, parseISO } from 'date-fns';
import type { QuestionnaireResponse } from 'fhir/r4';
import {
  computeQuestionnaireXp,
  extractQuestionnaireId,
  isDateInRange,
  sortBatches,
  type ResearchBatch,
  type StudyProgress
} from './research';
import { parseDimensionScores, type ScoreDimension } from './scores';

/** Minimal response shape accepted by report aggregation helpers. */
export interface ReportResponse {
  /** Canonical questionnaire reference, e.g. "Questionnaire/phq2". */
  questionnaire?: string;
  /** ISO authored timestamp, e.g. "2026-08-10T10:00:00Z". */
  authored?: string;
}

/**
 * Groups responses into their study batch, keyed by batch id.
 *
 * A response with an authored date counts toward a batch only when its
 * questionnaire is part of that batch and the date falls inside the batch
 * window. Responses without an authored date (guest drafts) fall back to
 * the first batch containing the questionnaire. Responses matching no batch
 * are dropped.
 *
 * @param responses - Completed responses to bucket.
 * @param batches - The study's batches.
 * @returns Map of batch id to its responses.
 */
export function bucketResponsesByBatch<T extends ReportResponse>(
  responses: readonly T[],
  batches: readonly ResearchBatch[]
): Map<string, T[]> {
  const buckets = new Map<string, T[]>();

  for (const response of responses) {
    const questionnaireId = extractQuestionnaireId(response.questionnaire);
    const authored = response.authored?.slice(0, 10);

    const inBatch = authored
      ? batches.find(
          batch =>
            batch.questionnaireIds.includes(questionnaireId ?? '') &&
            isDateInRange(authored, batch.start, batch.end)
        )
      : batches.find(batch =>
          batch.questionnaireIds.includes(questionnaireId ?? '')
        );

    if (!inBatch) continue;
    const list = buckets.get(inBatch.id) ?? [];
    list.push(response);
    buckets.set(inBatch.id, list);
  }

  return buckets;
}

/** One time row of a questionnaire trend: a single response on a batch. */
export interface TrendRow {
  batchId: string;
  /** Human label, e.g. "Batch 1 (Aug)". */
  label: string;
  authored?: string;
  dimensions: ScoreDimension[];
}

/** Trend availability for one questionnaire across the study's batches. */
export type TrendState =
  | { kind: 'none' }
  | { kind: 'baseline' }
  | { kind: 'trend'; rows: TrendRow[] };

/**
 * Human batch label, e.g. "Batch 2 (Sep)", using the batch's position.
 *
 * @param batch - The batch to label.
 * @param sorted - All batches sorted by period start ascending.
 * @returns The label.
 */
export function batchLabel(
  batch: ResearchBatch,
  sorted: readonly ResearchBatch[]
): string {
  const index = sorted.findIndex(item => item.id === batch.id) + 1;
  const month = format(parseISO(batch.start), 'MMM');
  return `Batch ${index} (${month})`;
}

/**
 * Resolves the trend state for one questionnaire across the study.
 *
 * Instruments deployed in a single batch never get a trend. A repeated
 * instrument (present in ≥2 batches) with at least two responses gets
 * chronological time rows; with a single response it reports a baseline.
 *
 * @param questionnaireId - Bare questionnaire id to resolve.
 * @param buckets - Responses already bucketed per batch.
 * @param batches - The study's batches, any order.
 * @returns The trend state for the questionnaire.
 */
export function trendForQuestionnaire(
  questionnaireId: string,
  buckets: ReadonlyMap<string, ReadonlyArray<QuestionnaireResponse>>,
  batches: readonly ResearchBatch[]
): TrendState {
  const sorted = sortBatches([...batches]);
  const deployments = sorted.filter(batch =>
    batch.questionnaireIds.includes(questionnaireId)
  );
  if (deployments.length < 2) return { kind: 'none' };

  const rows: TrendRow[] = [];
  for (const batch of sorted) {
    for (const response of buckets.get(batch.id) ?? []) {
      if (extractQuestionnaireId(response.questionnaire) !== questionnaireId) {
        continue;
      }
      rows.push({
        batchId: batch.id,
        label: batchLabel(batch, sorted),
        authored: response.authored,
        dimensions: parseDimensionScores(response)
      });
    }
  }

  if (rows.length >= 2) return { kind: 'trend', rows };
  if (rows.length === 1) return { kind: 'baseline' };
  return { kind: 'none' };
}

/** Aggregated participation statistics for one study report. */
export interface ParticipationStats {
  /** Total completed responses across all batches. */
  assessmentsCompleted: number;
  /** Batches with at least one completed response. */
  batchesCompleted: number;
  totalBatches: number;
  consecutiveBatches: number;
  /** XP from distinct questionnaire completions per batch (duration × 5). */
  xp: number;
  /** Sum of estimated durations across all completions. */
  timeInvestedMinutes: number;
  /** Earliest response date (yyyy-mm-dd), or null when none. */
  firstParticipationDate: string | null;
}

/**
 * Computes the participation statistics for a study report.
 *
 * XP counts each questionnaire once per batch period, mirroring the global
 * research progress semantics so repeated submissions cannot farm XP.
 *
 * @param study - The study being reported on.
 * @param responses - Completed responses across the study's batches.
 * @param durationByQuestionnaire - Questionnaire id → estimated minutes.
 * @returns Aggregated participation statistics.
 */
export function computeParticipationStats(
  study: StudyProgress,
  responses: readonly ReportResponse[],
  durationByQuestionnaire: Readonly<Record<string, number | null>>
): ParticipationStats {
  const buckets = bucketResponsesByBatch(responses, study.batches);

  const scopedIds: string[] = [];
  for (const batchResponses of buckets.values()) {
    const distinct = new Set<string>();
    for (const response of batchResponses) {
      const questionnaireId = extractQuestionnaireId(response.questionnaire);
      if (questionnaireId) distinct.add(questionnaireId);
    }
    scopedIds.push(...distinct);
  }

  let timeInvested = 0;
  let earliest: string | null = null;
  for (const response of responses) {
    const questionnaireId = extractQuestionnaireId(response.questionnaire);
    const duration = questionnaireId
      ? durationByQuestionnaire[questionnaireId]
      : null;
    if (duration) timeInvested += duration;

    const authored = response.authored?.slice(0, 10);
    if (authored && (earliest === null || authored < earliest)) {
      earliest = authored;
    }
  }

  return {
    assessmentsCompleted: responses.length,
    batchesCompleted: study.history.filter(entry => entry.participated).length,
    totalBatches: study.batches.length,
    consecutiveBatches: study.consecutiveBatches,
    xp: computeQuestionnaireXp(scopedIds, durationByQuestionnaire),
    timeInvestedMinutes: timeInvested,
    firstParticipationDate: earliest
  };
}
