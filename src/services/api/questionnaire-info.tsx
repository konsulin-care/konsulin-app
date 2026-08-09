'use client';

import { getQuestionnaireDuration } from '@/utils/fhir/service-duration';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Bundle, Questionnaire } from 'fhir/r4';
import { useMemo } from 'react';
import { getAPI } from '../api';

/** Resolved title and estimated duration for one questionnaire. */
export interface QuestionnaireInfo {
  title: string;
  /** Estimated minutes, or null when the duration extension is missing. */
  durationMinutes: number | null;
}

/** Shared empty title map for surfaces before titles have loaded. */
export const EMPTY_QUESTIONNAIRE_INFO_MAP: ReadonlyMap<
  string,
  QuestionnaireInfo
> = new Map();

/**
 * Resolves the display title for a single questionnaire id.
 *
 * Reads the shared `['questionnaire', id, 'title']` cache (seeded by record
 * lists, /report, and /research) and fetches `_elements=title` only when
 * uncached. The resolved value (title, or the raw id) is seeded back into the
 * shared cache so every surface shows the identical string.
 *
 * @param questionnaireId - Bare questionnaire id, or null/undefined.
 * @returns React Query result whose data is the questionnaire title.
 */
export function useQuestionnaireTitle(
  questionnaireId: string | null | undefined
) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['questionnaire', questionnaireId, 'title'],
    enabled: Boolean(questionnaireId),
    staleTime: Infinity,
    initialData: (): string | undefined =>
      questionnaireId
        ? (queryClient.getQueryData<string>([
            'questionnaire',
            questionnaireId,
            'title'
          ]) ?? undefined)
        : undefined,
    queryFn: async (): Promise<string | undefined> => {
      if (!questionnaireId) return undefined;
      const API = await getAPI();
      const { data } = await API.get<Bundle>(
        `/fhir/Questionnaire?_id=${questionnaireId}&_elements=title`
      );
      const questionnaire = data.entry?.[0]?.resource as
        | Questionnaire
        | undefined;
      const title = questionnaire?.title ?? questionnaireId;
      queryClient.setQueryData(
        ['questionnaire', questionnaireId, 'title'],
        title
      );
      return title;
    }
  });
}

/**
 * Fetches Questionnaire titles and estimated durations for a set of
 * questionnaire ids in one batch request, returning an id → info map.
 *
 * Resolved titles and durations are seeded into the shared
 * `['questionnaire', id, 'title']` / `['questionnaire', id, 'duration']`
 * caches (used by /record); the select merges entries already cached.
 *
 * @param questionnaireIds - Bare questionnaire ids to resolve.
 * @returns React Query result whose data maps each id to its info.
 */
export function useQuestionnaireTitles(questionnaireIds: string[]) {
  const queryClient = useQueryClient();
  const uniqueIds = useMemo(
    () => [...new Set(questionnaireIds)].toSorted((a, b) => a.localeCompare(b)),
    [questionnaireIds]
  );

  return useQuery({
    queryKey: ['questionnaire-titles', uniqueIds],
    enabled: uniqueIds.length > 0,
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<ReadonlyMap<string, QuestionnaireInfo>> => {
      const API = await getAPI();
      const { data } = await API.get<Bundle>(
        `/fhir/Questionnaire?_id=${uniqueIds.join(',')}&_elements=id,title,extension`
      );
      const info = new Map<string, QuestionnaireInfo>();
      for (const entry of data.entry ?? []) {
        const questionnaire = entry.resource as Questionnaire | undefined;
        if (!questionnaire?.id) continue;
        const title = questionnaire.title ?? questionnaire.id;
        const durationMinutes = getQuestionnaireDuration(questionnaire);
        info.set(questionnaire.id, { title, durationMinutes });
        queryClient.setQueryData(
          ['questionnaire', questionnaire.id, 'title'],
          title
        );
        queryClient.setQueryData(
          ['questionnaire', questionnaire.id, 'duration'],
          durationMinutes
        );
      }
      return info;
    },
    select: (fetched: ReadonlyMap<string, QuestionnaireInfo>) => {
      const merged = new Map(fetched);
      for (const id of uniqueIds) {
        if (merged.has(id)) continue;
        const cachedTitle = queryClient.getQueryData<string>([
          'questionnaire',
          id,
          'title'
        ]);
        if (cachedTitle) {
          const cachedDuration = queryClient.getQueryData<number | null>([
            'questionnaire',
            id,
            'duration'
          ]);
          merged.set(id, {
            title: cachedTitle,
            durationMinutes: cachedDuration ?? null
          });
        }
      }
      return merged;
    }
  });
}
