'use client';

import { ANONYMOUS_SESSION_IDENTIFIER_SYSTEM } from '@/constants/anonymous-session';
import { useAuth } from '@/context/auth/authContext';
import { STORES, dbGetAll } from '@/lib/indexeddb';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import {
  questionnaireIdOf,
  toCanonicalQuestionnaireUrl
} from '@/utils/fhir/questionnaire-url';
import { useQuery } from '@tanstack/react-query';
import type { Bundle, QuestionnaireResponse } from 'fhir/r4';
import { useMemo } from 'react';
import { getAPI } from '../api';

/** Dedupes responses by id, keeping the first occurrence. */
function mergeResponses(
  responses: QuestionnaireResponse[]
): QuestionnaireResponse[] {
  const seen = new Set<string>();
  const merged: QuestionnaireResponse[] = [];
  for (const response of responses) {
    if (!response.id || seen.has(response.id)) continue;
    seen.add(response.id);
    merged.push(response);
  }
  return merged;
}

/** Extracts full QuestionnaireResponse resources from a searchset bundle. */
function resourcesOf(bundle: Bundle): QuestionnaireResponse[] {
  return (bundle.entry ?? [])
    .map(entry => entry.resource)
    .filter(
      (resource): resource is QuestionnaireResponse =>
        resource?.resourceType === 'QuestionnaireResponse'
    );
}

/**
 * Comma-joined, per-canonical encoded `questionnaire` filter for the FHIR
 * search, e.g. `url1,url2` with each URL percent-encoded. FHIR treats the
 * comma as an OR across the values, so one request covers all ids.
 *
 * @param ids - Bare questionnaire ids to filter by.
 * @returns The encoded questionnaire search value, or '' when none resolve.
 */
function questionnaireFilter(ids: string[]): string {
  return ids
    .map(id => toCanonicalQuestionnaireUrl(id))
    .filter(Boolean)
    .map(canonical => encodeURIComponent(canonical))
    .join(',');
}

/**
 * Filters full responses down to the requested questionnaire id set, keeping
 * responses whose canonical/reference resolves into the set. The identity
 * scope may legally return other questionnaires (patient history, shared
 * batches), so the report surface stays bounded to the study's instruments.
 *
 * @param responses - Full responses from the identity-scoped search.
 * @param idSet - Bare questionnaire ids to keep.
 * @returns Responses whose questionnaire id is in the set.
 */
function scopedTo(
  responses: QuestionnaireResponse[],
  idSet: ReadonlySet<string>
): QuestionnaireResponse[] {
  return responses.filter(response => {
    const id = questionnaireIdOf(response.questionnaire);
    return id !== null && idSet.has(id);
  });
}

/**
 * Fetches the full completed QuestionnaireResponses for the current user.
 *
 * One FHIR search per identity scope: patients are matched by their author
 * id, guests by their anonymous session identifier (the scope used when
 * submitting and by research progress). The query is narrowed server-side to
 * the requested questionnaires via a comma-joined canonical filter and
 * bounded by `since` (authored=ge) and `until` (authored=le). Guests fall
 * back to the local IndexedDB drafts for offline or queued submissions; both
 * sources are merged so server copies win on id overlap, and any server or
 * storage failure degrades to the other source.
 *
 * @param questionnaireIds - Bare questionnaire ids to collect responses for.
 * @param since - Optional earliest authored date (yyyy-mm-dd) to bound the search.
 * @param until - Optional latest authored date (yyyy-mm-dd) to bound the search.
 * @returns React Query result with the merged full responses.
 */
export function useReportResponses(
  questionnaireIds: string[],
  since?: string | null,
  until?: string | null
) {
  const { state: authState, isLoading: authLoading } = useAuth();
  const isAuthenticated = authState?.isAuthenticated ?? false;
  const fhirId = authState?.userInfo?.fhirId;

  const uniqueIds = useMemo(
    () => [...new Set(questionnaireIds)].toSorted((a, b) => a.localeCompare(b)),
    [questionnaireIds]
  );

  return useQuery({
    queryKey: [
      'report-responses',
      isAuthenticated ? 'patient' : 'guest',
      isAuthenticated ? (fhirId ?? '') : 'local',
      uniqueIds,
      since ?? null,
      until ?? null
    ],
    enabled: uniqueIds.length > 0 && !authLoading,
    queryFn: async (): Promise<QuestionnaireResponse[]> => {
      const idSet = new Set(uniqueIds);
      const questionnaires = questionnaireFilter(uniqueIds);
      const lowerBound = since ? `&authored=ge${since}` : '';
      const upperBound = until ? `&authored=le${until}` : '';
      const commonSuffix = `&questionnaire=${questionnaires}&status=completed&_count=500${lowerBound}${upperBound}`;

      if (isAuthenticated && fhirId) {
        const API = await getAPI();
        const res = await API.get<Bundle>(
          `/fhir/QuestionnaireResponse?author=Patient/${fhirId}${commonSuffix}`
        );
        return mergeResponses(scopedTo(resourcesOf(res.data), idSet));
      }

      // Server-first for guests: the completed responses were POSTed under
      // this anonymous identifier before navigation, matching the scope used
      // by research progress. Drafts fill the offline/queued gap.
      let serverResponses: QuestionnaireResponse[] = [];
      try {
        const guestId = await ensureAnonymousSession(false);
        const API = await getAPI();
        const res = await API.get<Bundle>(
          `/fhir/QuestionnaireResponse?identifier=${encodeURIComponent(
            `${ANONYMOUS_SESSION_IDENTIFIER_SYSTEM}|${guestId}`
          )}${commonSuffix}`
        );
        serverResponses = mergeResponses(
          scopedTo(resourcesOf(res.data), idSet)
        );
      } catch {
        // Guest-id or server failure: fall through to local drafts only.
      }

      let draftResponses: QuestionnaireResponse[] = [];
      try {
        const drafts = await dbGetAll<{
          ownerId: string;
          questionnaireId: string;
          response: QuestionnaireResponse;
          updatedAt: number;
        }>(STORES.assessmentDrafts);
        // Drafts use updatedAt, not authored; date bounds would discard valid work
        draftResponses = drafts
          .filter(draft => idSet.has(draft.questionnaireId))
          .map(draft => draft.response);
      } catch {
        // Storage failure: keep only the server responses.
      }

      return mergeResponses([...serverResponses, ...draftResponses]);
    }
  });
}
