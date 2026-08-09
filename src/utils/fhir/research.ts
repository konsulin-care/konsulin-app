import { xpForDuration } from '@/constants/research';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { questionnaireIdOf } from './questionnaire-url';

/** Minimal response projection used for progress computation. */
export interface ResearchResponse {
  id: string;
  /** Canonical questionnaire reference, e.g. "Questionnaire/phq2". */
  questionnaire: string;
  /** ISO authored timestamp, e.g. "2026-08-10T10:00:00Z". */
  authored?: string;
}

/** One batch of a study: a fixed period with a questionnaire set. */
export interface ResearchBatch {
  id: string;
  /** Batch window start, yyyy-mm-dd. */
  start: string;
  /** Batch window end (inclusive), yyyy-mm-dd. */
  end: string;
  questionnaireIds: string[];
}

/** Participation state of a single batch for the batch timeline. */
export interface BatchHistoryEntry {
  batchId: string;
  start: string;
  end: string;
  participated: boolean;
}

/** Computed progress for one study. */
export interface StudyProgress {
  study: ResearchStudy;
  batches: ResearchBatch[];
  /** Batch whose effectivePeriod contains today, or null. */
  currentBatch: ResearchBatch | null;
  /** Unique questionnaires completed within the current batch. */
  completedCount: number;
  /** Total questionnaires in the current batch. */
  totalCount: number;
  isComplete: boolean;
  /** First questionnaire in the current batch still to complete. */
  firstUncompletedQuestionnaireId: string | null;
  /** Questionnaires completed within the current batch. */
  completedQuestionnaireIds: string[];
  /** Per-batch participation, sorted by start ascending. */
  history: BatchHistoryEntry[];
  /** Run of participated batches ending at the newest participated batch. */
  consecutiveBatches: number;
}

/** Aggregate progress across all active studies. */
export interface ResearchProgress {
  studies: StudyProgress[];
  /** Distinct completed responses across all identity queries. */
  cumulativeResponses: number;
  /**
   * Questionnaire id per (study batch, questionnaire) pair that counts
   * toward XP: one award per study that deploys the questionnaire in a
   * batch containing the response, distinct within each batch.
   */
  questionnaireResponses: string[];
  /**
   * XP earned from questionnaire submissions: one award per study batch
   * that deploys the completed questionnaire (minutes, 5 XP fallback).
   */
  questionnaireXp: number;
  /** Unique questionnaire ids ever completed within a study batch. */
  completedQuestionnaireIds: string[];
  /** Study ids with an active on-study ResearchSubject for this patient. */
  consentedStudyIds: string[];
}

/**
 * Whole calendar days from today until a batch closes, never negative.
 *
 * @param end - Batch close date, yyyy-mm-dd.
 * @returns Number of days remaining, 0 when already closed.
 */
export function daysUntilBatch(end: string): number {
  return Math.max(0, differenceInCalendarDays(parseISO(end), new Date()));
}

/**
 * Returns the earliest study period start (yyyy-mm-dd) across the studies,
 * or null when no study declares a period start.
 *
 * @param studies - Active studies to consider.
 * @returns The earliest period start, or null.
 */
export function earliestStudyStart(
  studies: readonly ResearchStudy[]
): string | null {
  let earliest: string | null = null;
  for (const study of studies) {
    const start = study.period?.start;
    if (!start) continue;
    if (earliest === null || start < earliest) earliest = start;
  }
  return earliest;
}

/**
 * Extracts the questionnaire id from a canonical or reference string,
 * stripping any version suffix (e.g. "Questionnaire/phq2|1.0" -> "phq2").
 *
 * Consolidated with questionnaireIdOf in questionnaire-url.ts.
 *
 * @param canonical - Canonical questionnaire reference.
 * @returns The bare questionnaire id, or null when absent.
 */
export const extractQuestionnaireId = questionnaireIdOf;

/**
 * Parses a resource reference or canonical into its id, optionally checking
 * the expected resource type.
 *
 * @param value - Reference string (e.g. "PlanDefinition/research").
 * @param expectedType - Expected FHIR resource type, when known.
 * @returns The resource id, or null when unparseable.
 */
export function parseCanonicalOrReference(
  value?: string,
  expectedType?: string
): string | null {
  if (!value) return null;
  const withoutVersion = value.split('|')[0];
  const parts = withoutVersion.split('/').filter(Boolean);

  if (!expectedType) return parts.at(-1) ?? null;

  const typeIndex = parts.indexOf(expectedType);
  if (typeIndex !== -1 && parts[typeIndex + 1]) return parts[typeIndex + 1];
  if (parts.length === 2 && parts[0] === expectedType) return parts[1];
  if (parts.length === 1) return parts[0];
  return null;
}

/**
 * Converts a PlanDefinition into a batch. Returns null when the plan lacks
 * an id or an effectivePeriod, since the batch window is undefined then.
 *
 * @param plan - FHIR PlanDefinition resource.
 * @returns The batch, or null.
 */
export function toResearchBatch(plan: PlanDefinition): ResearchBatch | null {
  const period = plan.effectivePeriod;
  if (!plan.id || !period?.start || !period?.end) return null;

  const questionnaireIds = (plan.action ?? [])
    .map(action => extractQuestionnaireId(action.definitionCanonical))
    .filter((id): id is string => id !== null);

  return {
    id: plan.id,
    start: period.start,
    end: period.end,
    questionnaireIds: [...new Set(questionnaireIds)]
  };
}

/**
 * Checks whether a yyyy-mm-dd date falls inside an inclusive [start, end]
 * window. String comparison is chronological for zero-padded ISO dates.
 *
 * @param date - Date to test, yyyy-mm-dd.
 * @param start - Inclusive window start.
 * @param end - Inclusive window end.
 * @returns True when within range.
 */
export function isDateInRange(
  date: string,
  start?: string,
  end?: string
): boolean {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

/**
 * Returns true when a response belongs to a batch: its questionnaire is part
 * of the batch and it was authored within the batch period.
 *
 * @param response - Completed QuestionnaireResponse projection.
 * @param batch - Target batch.
 * @returns True when the response counts toward the batch.
 */
export function isResponseInBatch(
  response: ResearchResponse,
  batch: ResearchBatch
): boolean {
  const questionnaireId = extractQuestionnaireId(response.questionnaire);
  if (!questionnaireId || !batch.questionnaireIds.includes(questionnaireId)) {
    return false;
  }
  if (!response.authored) return false;
  return isDateInRange(response.authored.slice(0, 10), batch.start, batch.end);
}

/**
 * Dedupes responses by id, keeping the first occurrence. Used to merge the
 * author and identifier queries so claimed responses count once.
 *
 * @param responses - Raw responses, possibly duplicated across queries.
 * @returns Responses with unique ids, preserving order.
 */
export function mergeResponses(
  responses: ResearchResponse[]
): ResearchResponse[] {
  const seen = new Set<string>();
  const merged: ResearchResponse[] = [];
  for (const response of responses) {
    if (!response.id || seen.has(response.id)) continue;
    seen.add(response.id);
    merged.push(response);
  }
  return merged;
}

/**
 * Sorts batches by period start ascending.
 *
 * @param batches - Batches to sort.
 * @returns A new batch array ordered by start.
 */
export function sortBatches(batches: ResearchBatch[]): ResearchBatch[] {
  return batches.toSorted((a, b) => a.start.localeCompare(b.start));
}

/**
 * Counts the run of participated batches ending at the newest participated
 * batch. A gap (non-participated batch) resets the run.
 *
 * @param history - Per-batch participation, newest-last.
 * @returns The consecutive participated batch count.
 */
export function computeConsecutiveBatches(
  history: BatchHistoryEntry[]
): number {
  let streak = 0;
  for (const entry of history.toReversed()) {
    if (!entry.participated) {
      if (streak > 0) break;
      continue;
    }
    streak += 1;
  }
  return streak;
}

/**
 * Computes batch-level progress for a single study.
 *
 * @param study - FHIR ResearchStudy resource.
 * @param batches - Batches belonging to the study, unsorted.
 * @param responses - Completed responses (not yet merged).
 * @param today - Reference date, yyyy-mm-dd.
 * @returns Study progress including current-batch state and history.
 */
export function computeStudyProgress(
  study: ResearchStudy,
  batches: ResearchBatch[],
  responses: ResearchResponse[],
  today: string
): StudyProgress {
  const sorted = sortBatches(batches);
  const currentBatch =
    sorted.find(batch => isDateInRange(today, batch.start, batch.end)) ?? null;

  /** Filters responses that fall inside the given batch window. */
  const inBatch = (batch: ResearchBatch) =>
    responses.filter(response => isResponseInBatch(response, batch));

  const completedQuestionnaireIds = currentBatch
    ? [
        ...new Set(
          inBatch(currentBatch)
            .map(response => extractQuestionnaireId(response.questionnaire))
            .filter((id): id is string => id !== null)
        )
      ]
    : [];

  const totalCount = currentBatch?.questionnaireIds.length ?? 0;
  const completedCount = completedQuestionnaireIds.length;

  const history: BatchHistoryEntry[] = sorted.map(batch => ({
    batchId: batch.id,
    start: batch.start,
    end: batch.end,
    participated: inBatch(batch).length > 0
  }));

  return {
    study,
    batches: sorted,
    currentBatch,
    completedCount,
    totalCount,
    isComplete: totalCount > 0 && completedCount >= totalCount,
    firstUncompletedQuestionnaireId: currentBatch
      ? (currentBatch.questionnaireIds.find(
          id => !completedQuestionnaireIds.includes(id)
        ) ?? null)
      : null,
    completedQuestionnaireIds,
    history,
    consecutiveBatches: computeConsecutiveBatches(history)
  };
}

/**
 * Resolves the study that deploys a questionnaire in its current batch,
 * falling back to the first study. Used to scope share links to the study a
 * completed questionnaire belongs to.
 *
 * @param studies - Computed per-study progress.
 * @param questionnaireId - Bare questionnaire id to match.
 * @returns The study id, or undefined when there are no studies.
 */
export function resolveStudyIdForQuestionnaire(
  studies: StudyProgress[],
  questionnaireId: string
): string | undefined {
  return (
    studies.find(study =>
      study.currentBatch?.questionnaireIds.includes(questionnaireId)
    )?.study.id ?? studies[0]?.study.id
  );
}

/** Continuation target after completing a questionnaire inside a research batch. */
export interface AssessmentContinuation {
  /** Chosen study whose current batch contains the completed questionnaire. */
  studyId: string;
  /** Next uncompleted questionnaire in that batch, or null when the batch is complete. */
  nextQuestionnaireId: string | null;
}

/**
 * Recommended next questionnaire after completing one in a research batch.
 * Among all studies whose current batch contains the questionnaire, prefers
 * the requested study; otherwise picks the one with the fewest remaining
 * questionnaires (shortest path). Treats the just-completed questionnaire
 * and any chain-done questionnaires (doneQuestionnaireIds) as done. Returns
 * null when the questionnaire is not part of any current batch.
 *
 * @param studies - Computed per-study progress.
 * @param questionnaireId - Bare questionnaire id that was just completed.
 * @param preferredStudyId - Study the chain should stay within, when it also
 * deploys the questionnaire in its current batch.
 * @param doneQuestionnaireIds - Questionnaire ids completed earlier in the
 * same chain, excluded regardless of cache freshness.
 * @returns The chosen study's continuation, or null when no current batch contains it.
 */
export function nextAssessmentInStudy(
  studies: StudyProgress[],
  questionnaireId: string,
  preferredStudyId?: string,
  doneQuestionnaireIds: readonly string[] = []
): AssessmentContinuation | null {
  const doneSet = new Set(doneQuestionnaireIds);
  const candidates = studies
    .filter(study =>
      study.currentBatch?.questionnaireIds.includes(questionnaireId)
    )
    .map(study => {
      const remaining =
        study.currentBatch?.questionnaireIds.filter(
          id =>
            id !== questionnaireId &&
            !doneSet.has(id) &&
            !study.completedQuestionnaireIds.includes(id)
        ) ?? [];
      return { study, remaining };
    });

  if (candidates.length === 0) return null;

  const preferred = preferredStudyId
    ? candidates.find(c => c.study.study.id === preferredStudyId)
    : undefined;
  if (preferred) {
    return {
      studyId: preferred.study.study.id,
      nextQuestionnaireId: preferred.remaining[0] ?? null
    };
  }

  type BatchCandidate = { study: StudyProgress; remaining: string[] };

  let shortest: BatchCandidate | null = null;
  for (const candidate of candidates) {
    if (
      shortest === null ||
      candidate.remaining.length < shortest.remaining.length
    ) {
      shortest = candidate;
    }
  }
  if (shortest === null) return null;
  return {
    studyId: shortest.study.study.id,
    nextQuestionnaireId: shortest.remaining[0] ?? null
  };
}

/**
 * Sums questionnaire XP from per-response questionnaire ids.
 *
 * Each response contributes its estimated duration in minutes times
 * XP_PER_MINUTE, falling back to DEFAULT_QUESTIONNAIRE_XP when the duration
 * is unknown or missing.
 *
 * @param questionnaireIds - Bare questionnaire id per completed response.
 * @param durationByQuestionnaire - Map of questionnaire id to minutes (or null).
 * @returns The total questionnaire XP.
 */
export function computeQuestionnaireXp(
  questionnaireIds: readonly string[],
  durationByQuestionnaire: Readonly<Record<string, number | null>> = {}
): number {
  return questionnaireIds.reduce(
    (sum, id) => sum + xpForDuration(durationByQuestionnaire[id]),
    0
  );
}

/**
 * Aggregates per-study progress into a single ResearchProgress object.
 *
 * XP is scoped to study batches: each questionnaire completed within a batch
 * awards XP once per study that deploys it in that batch, so a questionnaire
 * shared across studies earns multiplied XP. Repeated submissions within the
 * same study batch still count once, so they cannot farm XP. Responses
 * authored outside every batch contribute no XP.
 *
 * @param studies - Computed per-study progress.
 * @param responses - Raw responses across all identity queries.
 * @param consentedStudyIds - Study ids with an active consent.
 * @param durationByQuestionnaire - Map of questionnaire id to minutes (or null).
 * @returns Aggregate progress with questionnaire XP and response set.
 */
export function computeResearchProgress(
  studies: StudyProgress[],
  responses: ResearchResponse[],
  consentedStudyIds: string[] = [],
  durationByQuestionnaire: Readonly<Record<string, number | null>> = {}
): ResearchProgress {
  const merged = mergeResponses(responses);

  const questionnaireResponses = studies.flatMap(study =>
    study.batches.flatMap(batch => {
      const distinct = new Set<string>();
      for (const response of merged) {
        if (!isResponseInBatch(response, batch)) continue;
        const id = extractQuestionnaireId(response.questionnaire);
        if (id) distinct.add(id);
      }
      return [...distinct];
    })
  );

  return {
    studies,
    cumulativeResponses: merged.length,
    questionnaireResponses,
    questionnaireXp: computeQuestionnaireXp(
      questionnaireResponses,
      durationByQuestionnaire
    ),
    completedQuestionnaireIds: [...new Set(questionnaireResponses)],
    consentedStudyIds
  };
}
