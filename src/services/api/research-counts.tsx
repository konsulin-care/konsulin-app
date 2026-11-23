import { toCanonicalQuestionnaireUrl } from '@/utils/fhir/questionnaire-url';
import { useQuery } from '@tanstack/react-query';
import type { Bundle } from 'fhir/r4';
import { useMemo } from 'react';
import { getAPI } from '../api';

/** Minimum visible completion total to avoid re-identifying individuals. */
export const COMPLETION_COUNT_FLOOR = 5;

/** How long count queries stay fresh before refetching. */
const COUNT_STALE_TIME = 30 * 60_000;

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
 * Fetches the participant count for a single study.
 *
 * @param studyId - ResearchStudy id, or undefined to skip the query.
 * @param options - Optional query flags; `enabled: false` suppresses the request.
 * @returns React Query result whose data is the participant count.
 */
export function useStudyParticipantCount(
  studyId: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['study-participant-count', studyId],
    enabled: Boolean(studyId) && (options?.enabled ?? true),
    staleTime: COUNT_STALE_TIME,
    queryFn: async (): Promise<number> => {
      const API = await getAPI();
      const { data } = await API.get<Bundle>(
        `/fhir/ResearchSubject?study=ResearchStudy/${studyId}&_summary=count`
      );
      return data.total ?? 0;
    }
  });
}

/** Per-questionnaire completion counts map. */
export type PerQuestionnaireCounts = Map<string, number>;

/**
 * Fetches completion counts per questionnaire for researcher view.
 *
 * Issues one `_summary=count&questionnaire=<canonical>` request per
 * questionnaire in parallel and returns a map of questionnaire id to count.
 * Results are cached for 30 minutes.
 *
 * @param questionnaireIds - Bare questionnaire ids in the batch.
 * @returns React Query result with a Map of questionnaire id to count.
 */
export function usePerQuestionnaireCounts(questionnaireIds: string[]) {
  const ids = useMemo(
    () => [...new Set(questionnaireIds)].toSorted((a, b) => a.localeCompare(b)),
    [questionnaireIds]
  );

  return useQuery({
    queryKey: ['per-questionnaire-counts', ids],
    enabled: ids.length > 0,
    staleTime: COUNT_STALE_TIME,
    queryFn: async (): Promise<PerQuestionnaireCounts> => {
      const API = await getAPI();
      const entries = await Promise.all(
        ids.map(async (id): Promise<[string, number] | null> => {
          const canonical = toCanonicalQuestionnaireUrl(id);
          if (!canonical) return null;
          const response = await API.get<{ total?: number }>(
            `/fhir/QuestionnaireResponse?_summary=count&questionnaire=${canonical}`
          );
          return [id, response.data.total ?? 0];
        })
      );
      return new Map(
        entries.filter((entry): entry is [string, number] => entry !== null)
      );
    }
  });
}
