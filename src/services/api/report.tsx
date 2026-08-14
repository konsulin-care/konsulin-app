'use client';

import { ANONYMOUS_SESSION_IDENTIFIER_SYSTEM } from '@/constants/anonymous-session';
import { useAuth } from '@/context/auth/authContext';
import { STORES, dbGetAll } from '@/lib/indexeddb';
import { ensureAnonymousSession } from '@/services/anonymous-session';
import { toCanonicalQuestionnaireUrl } from '@/utils/fhir/questionnaire-url';
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
 * Fetches the full completed QuestionnaireResponses for the current user.
 *
 * Authenticated patients get one FHIR search per questionnaire scoped to
 * their author id. Guests query the same server scoped by their anonymous
 * session identifier (the scope used when submitting and by research
 * progress), falling back to the local IndexedDB drafts for offline or
 * queued submissions. Both sources are merged so server copies win on id
 * overlap; any server or storage failure degrades to the other source.
 *
 * @param questionnaireIds - Bare questionnaire ids to collect responses for.
 * @returns React Query result with the merged full responses.
 */
export function useReportResponses(questionnaireIds: string[]) {
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
      uniqueIds
    ],
    enabled: uniqueIds.length > 0 && !authLoading,
    queryFn: async (): Promise<QuestionnaireResponse[]> => {
      if (isAuthenticated && fhirId) {
        const API = await getAPI();
        const results = await Promise.all(
          uniqueIds.map(async id => {
            const canonical = toCanonicalQuestionnaireUrl(id);
            if (!canonical) return [];
            const res = await API.get<Bundle>(
              `/fhir/QuestionnaireResponse?author=Patient/${fhirId}&questionnaire=${encodeURIComponent(canonical)}&status=completed&_count=500`
            );
            return resourcesOf(res.data);
          })
        );
        return mergeResponses(results.flat());
      }

      const idSet = new Set(uniqueIds);

      // Server-first for guests: the completed responses were POSTed under
      // this anonymous identifier before navigation, matching the scope used
      // by research progress. Drafts fill the offline/queued gap.
      let serverResponses: QuestionnaireResponse[] = [];
      try {
        const guestId = await ensureAnonymousSession(false);
        const API = await getAPI();
        const results = await Promise.all(
          uniqueIds.map(async id => {
            const canonical = toCanonicalQuestionnaireUrl(id);
            if (!canonical) return [];
            const res = await API.get<Bundle>(
              `/fhir/QuestionnaireResponse?identifier=${encodeURIComponent(
                `${ANONYMOUS_SESSION_IDENTIFIER_SYSTEM}|${guestId}`
              )}&questionnaire=${encodeURIComponent(
                canonical
              )}&status=completed&_count=500`
            );
            return resourcesOf(res.data);
          })
        );
        serverResponses = mergeResponses(results.flat());
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
