import {
  getResearchLevelProgress,
  type ResearchLevelProgress
} from '@/constants/research';
import type {
  Bundle,
  PlanDefinition,
  QuestionnaireResponse,
  ResearchStudy,
  Resource
} from 'fhir/r4';

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
  currentLevel: ResearchLevelProgress['current'];
  nextLevel: ResearchLevelProgress['next'];
  levelProgress: ResearchLevelProgress;
  /** Unique questionnaire ids ever completed. */
  completedQuestionnaireIds: string[];
}

/**
 * Extracts the questionnaire id from a canonical or reference string,
 * stripping any version suffix (e.g. "Questionnaire/phq2|1.0" -> "phq2").
 *
 * @param canonical - Canonical questionnaire reference.
 * @returns The bare questionnaire id, or null when absent.
 */
export function extractQuestionnaireId(canonical?: string): string | null {
  if (!canonical) return null;
  const withoutVersion = canonical.split('|')[0];
  const segments = withoutVersion.split('/').filter(Boolean);
  return segments.at(-1) ?? null;
}

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
    if (!response?.id || seen.has(response.id)) continue;
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
  let index = history.length - 1;
  while (index >= 0 && !history[index].participated) {
    index -= 1;
  }
  let streak = 0;
  while (index >= 0 && history[index].participated) {
    streak += 1;
    index -= 1;
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
 * Aggregates per-study progress into a single ResearchProgress object.
 *
 * @param studies - Computed per-study progress.
 * @param responses - Raw responses across all identity queries.
 * @returns Aggregate progress with cumulative level and response set.
 */
export function computeResearchProgress(
  studies: StudyProgress[],
  responses: ResearchResponse[]
): ResearchProgress {
  const merged = mergeResponses(responses);
  const levelProgress = getResearchLevelProgress(merged.length);

  return {
    studies,
    cumulativeResponses: merged.length,
    currentLevel: levelProgress.current,
    nextLevel: levelProgress.next,
    levelProgress,
    completedQuestionnaireIds: [
      ...new Set(
        merged
          .map(response => extractQuestionnaireId(response.questionnaire))
          .filter((id): id is string => id !== null)
      )
    ]
  };
}

/** Recursively flattens nested bundle entries into their resources. */
function collectBundleResources(bundle: Bundle): Resource[] {
  const resources: Resource[] = [];
  const walk = (current: Bundle) => {
    for (const entry of current.entry ?? []) {
      const resource = entry.resource;
      if (!resource) continue;
      if (resource.resourceType === 'Bundle') {
        walk(resource);
      } else {
        resources.push(resource);
      }
    }
  };
  walk(bundle);
  return resources;
}

/**
 * Parses a batch-response bundle (studies + _include PlanDefinitions +
 * QuestionnaireResponses) into a typed ResearchProgress object.
 *
 * @param bundle - The batch-response bundle returned by the FHIR server.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns Aggregated research progress.
 */
export function parseResearchBundle(
  bundle: Bundle,
  today: string
): ResearchProgress {
  const resources = collectBundleResources(bundle);

  const studies = resources.filter(
    (resource): resource is ResearchStudy =>
      resource.resourceType === 'ResearchStudy'
  );
  const plans = resources.filter(
    (resource): resource is PlanDefinition =>
      resource.resourceType === 'PlanDefinition'
  );
  const responses = resources
    .filter(
      (resource): resource is QuestionnaireResponse =>
        resource.resourceType === 'QuestionnaireResponse'
    )
    .map(response => ({
      id: response.id ?? '',
      questionnaire: response.questionnaire ?? '',
      authored: response.authored
    }));

  const batchesByPlanId = new Map<string, ResearchBatch>();
  for (const plan of plans) {
    const batch = toResearchBatch(plan);
    if (batch) batchesByPlanId.set(batch.id, batch);
  }

  const studyProgress = studies.map(study => {
    const batchIds = (study.protocol ?? [])
      .map(reference =>
        parseCanonicalOrReference(reference.reference, 'PlanDefinition')
      )
      .filter((id): id is string => id !== null);
    const batches = batchIds
      .map(id => batchesByPlanId.get(id))
      .filter((batch): batch is ResearchBatch => batch !== undefined);
    return computeStudyProgress(study, batches, responses, today);
  });

  return computeResearchProgress(studyProgress, responses);
}
