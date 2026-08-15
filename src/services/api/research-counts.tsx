import { toCanonicalQuestionnaireUrl } from '@/utils/fhir/questionnaire-url';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getAPI } from '../api';

/** Minimum visible completion total to avoid re-identifying individuals. */
export const COMPLETION_COUNT_FLOOR = 5;

/** Aggregated completion counts across a set of questionnaires. */
export interface StudyCompletionCounts {
  /** Raw sum of completed responses across the questionnaires. */
  total: number;
  /** Total when at or above the k-anonymity floor, else null. */
  visibleCount: number | null;
}

/**
 * Masks a completion total below the k-anonymity floor.
 *
 * @param total - Raw completion count.
 * @param floor - Minimum total worth showing.
 * @returns The total when it meets the floor, otherwise null.
 */
export function withKAnonymityFloor(
  total: number,
  floor: number = COMPLETION_COUNT_FLOOR
): number | null {
  return total >= floor ? total : null;
}

/**
 * Sums the completed QuestionnaireResponse totals for a set of
 * questionnaires, one `_summary=count` query per questionnaire.
 *
 * @param API - Authenticated FHIR API instance.
 * @param questionnaireIds - Bare questionnaire ids to count.
 * @returns The summed completion total.
 */
async function fetchCompletionTotal(
  API: Awaited<ReturnType<typeof getAPI>>,
  questionnaireIds: string[]
): Promise<number> {
  let total = 0;
  for (const id of questionnaireIds) {
    const canonical = toCanonicalQuestionnaireUrl(id);
    if (!canonical) continue;
    const response = await API.get<{ total?: number }>(
      `/fhir/QuestionnaireResponse?_summary=count&questionnaire=${canonical}`
    );
    total += response.data.total ?? 0;
  }
  return total;
}

/**
 * Fetches the aggregate completion count for a study batch's questionnaires.
 *
 * Runs one `_summary=count&questionnaire=<canonical>` query per questionnaire
 * id and sums the totals. Results are cached for at least 15 minutes so
 * social-proof widgets do not hammer the FHIR server on every render.
 *
 * @param questionnaireIds - Bare questionnaire ids in the batch.
 * @returns React Query result with summed totals and k-anonymity masking.
 */
export function useStudyCompletionCounts(questionnaireIds: string[]) {
  const ids = useMemo(
    () => [...new Set(questionnaireIds)].toSorted((a, b) => a.localeCompare(b)),
    [questionnaireIds]
  );

  return useQuery({
    queryKey: ['study-completion-counts', ids],
    enabled: ids.length > 0,
    staleTime: 15 * 60_000,
    queryFn: async (): Promise<StudyCompletionCounts> => {
      const API = await getAPI();
      const total = await fetchCompletionTotal(API, ids);
      return { total, visibleCount: withKAnonymityFloor(total) };
    }
  });
}
