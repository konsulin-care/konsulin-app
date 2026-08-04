import { ANONYMOUS_SESSION_IDENTIFIER_SYSTEM } from '@/constants/anonymous-session';
import { useAuth } from '@/context/auth/authContext';
import { toCanonicalQuestionnaireUrl } from '@/utils/fhir/questionnaire-url';
import {
  parseResearchBundle,
  type ResearchProgress
} from '@/utils/fhir/research';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { Bundle } from 'fhir/r4';
import { useEffect, useMemo, useState } from 'react';
import { ensureAnonymousSession } from '../anonymous-session';
import { getAPI } from '../api';

/** Identity under which research progress is tracked. */
export interface ResearchIdentity {
  kind: 'patient' | 'guest';
  id: string;
}

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
    total += response.data?.total ?? 0;
  }
  return total;
}

/** URL for a QuestionnaireResponse search by FHIR author reference. */
const AUTHOR_QR_SEARCH = 'QuestionnaireResponse?author=Patient/';
/** URL for a QuestionnaireResponse search by anonymous guest identifier. */
const IDENTIFIER_QR_SEARCH = 'QuestionnaireResponse?identifier=';
/** Common search suffix: only completed responses, minimal fields. */
const QR_SEARCH_SUFFIX =
  '&status=completed&_elements=questionnaire,authored&_count=500';

/**
 * Builds a FHIR batch bundle that fetches the active studies (with their
 * batch PlanDefinitions via _include) and the user's completed responses
 * in a single round trip.
 *
 * @param identity - Patient or guest identity.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns A FHIR batch bundle of GET search requests.
 */
export function buildResearchBundle(
  identity: ResearchIdentity,
  today: string
): Bundle {
  const identifierValue = encodeURIComponent(
    `${ANONYMOUS_SESSION_IDENTIFIER_SYSTEM}|${identity.id}`
  );
  return {
    resourceType: 'Bundle',
    type: 'batch',
    entry: [
      {
        request: {
          method: 'GET',
          url: `ResearchStudy?date=ge${today}&status=active&_include=ResearchStudy:protocol`
        }
      },
      {
        request: {
          method: 'GET',
          url: `${AUTHOR_QR_SEARCH}${identity.id}${QR_SEARCH_SUFFIX}`
        }
      },
      {
        request: {
          method: 'GET',
          url: `${IDENTIFIER_QR_SEARCH}${identifierValue}${QR_SEARCH_SUFFIX}`
        }
      }
    ]
  };
}

/**
 * Fetches the research progress for the current user: active studies, their
 * current batch, and the user's completed responses, aggregated into a
 * typed ResearchProgress object.
 *
 * Patients are matched by FHIR author; guests by anonymous identifier.
 * Both queries run in one batch bundle and are merged (deduped by id) so
 * claimed and unclaimed responses both count.
 *
 * @returns React Query result with ResearchProgress data.
 */
export function useResearchProgress() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const [identity, setIdentity] = useState<ResearchIdentity | null>(null);

  const isAuthenticated = authState?.isAuthenticated ?? false;
  const fhirId = authState?.userInfo?.fhirId;
  // Patients and guests only: practitioners/admins have no fhirId and are
  // not eligible for research participation.
  const isEligible = !isAuthenticated || Boolean(fhirId);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthLoading && isEligible) {
      // deepsource:ignore JS-0098 — fire-and-forget identity resolution
      void (async () => {
        if (isAuthenticated && fhirId) {
          if (!cancelled) setIdentity({ kind: 'patient', id: fhirId });
          return;
        }
        try {
          const guestId = await ensureAnonymousSession(false);
          if (!cancelled) setIdentity({ kind: 'guest', id: guestId });
        } catch {
          if (!cancelled) setIdentity(null);
        }
      })();
    } else {
      setIdentity(null);
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isEligible, isAuthenticated, fhirId]);

  return useQuery({
    queryKey: ['research', identity?.kind ?? 'none', identity?.id ?? 'none'],
    enabled: identity !== null,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ResearchProgress> => {
      if (!identity) throw new Error('Research identity not resolved');
      const today = format(new Date(), 'yyyy-MM-dd');
      const bundle = buildResearchBundle(identity, today);
      const API = await getAPI();
      const response = await API.post<Bundle>('/fhir', bundle);
      return parseResearchBundle(response.data, today);
    }
  });
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
