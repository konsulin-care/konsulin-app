import { ANONYMOUS_SESSION_IDENTIFIER_SYSTEM } from '@/constants/anonymous-session';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { pruneForeignResearchQueries } from '@/lib/query-persistence/clear';
import { clearConsentFlag, readConsentFlag } from '@/utils/consent';
import type { ResearchProgress, StudyProgress } from '@/utils/fhir/research';
import {
  computeResearchProgress,
  earliestStudyStart
} from '@/utils/fhir/research';
import {
  parseQuestionnaireResponseSearchset,
  recomputeStudyProgress
} from '@/utils/fhir/research-bundle';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { Bundle } from 'fhir/r4';
import { useEffect, useRef, useState } from 'react';
import { ensureAnonymousSession } from '../anonymous-session';
import { getAPI } from '../api';
import { submitFhirBundle } from './fhir-bundle';
import {
  fetchConsentedStudyIds,
  fetchStudiesByIds,
  fetchStudyCatalogue
} from './research-catalogue';
import { prefetchCurrentBatchQuestionnaires } from './research-prefetch';

export type { QuestionnaireInfo } from './questionnaire-info';

/** Identity under which research progress is tracked. */
export interface ResearchIdentity {
  kind: 'patient' | 'guest';
  id: string;
}

/** Common search suffix: only completed responses, minimal fields. */
const QR_SEARCH_SUFFIX =
  '&status=completed&_elements=questionnaire,authored,author&_count=500';

/**
 * Builds the QuestionnaireResponse search URL for an identity, optionally
 * bounded below by the earliest study period start (authored=ge). Patients
 * are matched by FHIR author; guests by anonymous identifier.
 *
 * @param identity - Patient or guest identity.
 * @param earliest - Earliest study period start, yyyy-mm-dd, or null.
 * @returns The FHIR search URL for the user's completed responses.
 */
export function buildQuestionnaireResponseSearch(
  identity: ResearchIdentity,
  earliest: string | null
): string {
  const scope =
    identity.kind === 'patient'
      ? `author=Patient/${identity.id}`
      : `identifier=${encodeURIComponent(
          `${ANONYMOUS_SESSION_IDENTIFIER_SYSTEM}|${identity.id}`
        )}`;
  const bound = earliest ? `&authored=ge${earliest}` : '';
  return `/fhir/QuestionnaireResponse?${scope}${QR_SEARCH_SUFFIX}${bound}`;
}

/**
 * Fetches the research progress for the current user: active studies, their
 * current batch, and the user's completed responses, aggregated into a
 * typed ResearchProgress object.
 *
 * Two sequential requests: the studies bundle first (so the earliest study
 * period start can bound the response search), then the completed-response
 * search scoped to the identity. Patients are matched by FHIR author, guests
 * by anonymous identifier. With `skipResponseSearch`, the response search is
 * omitted and the batch structure is returned with zero response-derived
 * counts — used by surfaces that fetch full responses separately.
 *
 * @param options - Optional. Set `{ skipResponseSearch: true }` to skip the
 *   completed-response search and return structure-only progress.
 * @returns React Query result with ResearchProgress data.
 */
function useResearchIdentity() {
  const queryClient = useQueryClient();
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const [identity, setIdentity] = useState<ResearchIdentity | null>(null);
  const [identityFailed, setIdentityFailed] = useState(false);

  const isAuthenticated = authState?.isAuthenticated ?? false;
  const fhirId = authState?.userInfo?.fhirId;
  const roleName = authState?.userInfo?.role_name;
  // Only patients and guests participate in research.  Practitioners,
  // researchers, and clinic admins have a Practitioner fhirId that must
  // not be mistaken for a Patient id.
  const isResearchParticipant =
    !roleName || roleName === Roles.Patient || roleName === Roles.Guest;
  const isEligible =
    isResearchParticipant && (!isAuthenticated || Boolean(fhirId));

  useEffect(() => {
    let cancelled = false;

    if (!isAuthLoading && isEligible) {
      // skipcq: JS-0098 - fire-and-forget identity resolution
      void (async () => {
        if (isAuthenticated && fhirId) {
          if (!cancelled) {
            setIdentityFailed(false);
            setIdentity({ kind: 'patient', id: fhirId });
          }
          return;
        }
        try {
          const guestId = await ensureAnonymousSession(false);
          if (!cancelled) {
            setIdentityFailed(false);
            setIdentity({ kind: 'guest', id: guestId });
          }
        } catch {
          if (!cancelled) setIdentityFailed(true);
        }
      })();
    } else {
      setIdentity(null);
      setIdentityFailed(false);
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isEligible, isAuthenticated, fhirId]);

  // Drop cached progress that belongs to a previous identity (for example a
  // guest session that became a patient) while keeping shared count queries.
  useEffect(() => {
    if (!identity) return;
    pruneForeignResearchQueries(queryClient, identity);
  }, [identity, queryClient]);

  return { identity, identityFailed, isEligible };
}

/** Fetch participant responses and compute study progress. */
async function fetchResearchProgress(
  identity: ResearchIdentity,
  skipResponseSearch: boolean
): Promise<ResearchProgress> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const API = await getAPI();

  const catalogue = await fetchStudyCatalogue(API, today);
  const consentedStudyIds =
    identity.kind === 'patient'
      ? await fetchConsentedStudyIds(API, identity.id)
      : [];
  const known = new Set(catalogue.map(study => study.study.id));
  const missing = consentedStudyIds.filter(id => !known.has(id));
  const closed = await fetchStudiesByIds(API, missing, today);
  const studyProgress = [...catalogue, ...closed];

  // Nothing to measure without active studies, or structure-only mode:
  // keep batches populated and feed no responses (counts stay zero).
  if (studyProgress.length === 0 || skipResponseSearch) {
    const structure = recomputeStudyProgress(studyProgress, [], today);
    return computeResearchProgress(structure, [], consentedStudyIds);
  }

  const earliest = earliestStudyStart(studyProgress.map(study => study.study));
  const qrResponse = await API.get<Bundle>(
    buildQuestionnaireResponseSearch(identity, earliest)
  );
  const responses = parseQuestionnaireResponseSearchset(qrResponse.data);
  const finalStudyProgress = recomputeStudyProgress(
    studyProgress,
    responses,
    today
  );

  return computeResearchProgress(
    finalStudyProgress,
    responses,
    consentedStudyIds
  );
}

/**
 * Fetches the research progress for the current user: active studies, their
 * current batch, and the user's completed responses, aggregated into a
 * typed ResearchProgress object.
 *
 * Two sequential requests: the studies bundle first (so the earliest study
 * period start can bound the response search), then the completed-response
 * search scoped to the identity. Patients are matched by FHIR author, guests
 * by anonymous identifier. With `skipResponseSearch`, the response search is
 * omitted and the batch structure is returned with zero response-derived
 * counts — used by surfaces that fetch full responses separately.
 *
 * @param options - Optional. Set `{ skipResponseSearch: true }` to skip the
 *   completed-response search and return structure-only progress.
 * @returns React Query result with ResearchProgress data.
 */
export function useResearchProgress(options?: {
  skipResponseSearch?: boolean;
}) {
  const skipResponseSearch = options?.skipResponseSearch ?? false;
  const queryClient = useQueryClient();
  const { identity, identityFailed, isEligible } = useResearchIdentity();

  const query = useQuery({
    queryKey: [
      'research',
      identity?.kind ?? 'none',
      identity?.id ?? 'none',
      skipResponseSearch ? 'structure' : 'full'
    ],
    enabled: identity !== null,
    staleTime: 5 * 60_000,
    queryFn: () => fetchResearchProgress(identity, skipResponseSearch)
  });

  // Warm the questionnaire cache for the current batch once full progress is
  // available. Counts and batch structure can render from cache, but opening
  // an uncompleted questionnaire needs its Questionnaire GET.
  useEffect(() => {
    if (skipResponseSearch || !query.data) return;
    // skipcq: JS-0098 - fire-and-forget prefetch; failures fall back to on-demand
    void prefetchCurrentBatchQuestionnaires(queryClient, query.data).catch(
      () => {
        /* prefetch is best-effort */
      }
    );
  }, [query.data, queryClient, skipResponseSearch]);

  // v5's isLoading (isPending && isFetching) is false while the query is
  // disabled during identity resolution, which would flash the empty state.
  // Loading means: no data yet and it may still arrive (auth resolution,
  // guest-session resolution, or the first fetch). Ineligible users and
  // failed sessions fall through to the empty state.
  return {
    ...query,
    isLoading: query.isPending && isEligible && !identityFailed
  };
}

/**
 * Builds a FHIR transaction bundle that records a patient's consent to a
 * study: a Consent resource (active, scope/category research) linked via a
 * urn to an on-study ResearchSubject.
 *
 * @param patientId - FHIR Patient id giving consent.
 * @param studyId - Bare ResearchStudy id being consented to.
 * @returns A transaction bundle creating Consent + ResearchSubject.
 */
export function buildConsentBundle(patientId: string, studyId: string): Bundle {
  const consentFullUrl = `urn:uuid:${crypto.randomUUID()}`;
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: [
      {
        fullUrl: consentFullUrl,
        resource: {
          resourceType: 'Consent',
          status: 'active',
          scope: {
            coding: [
              {
                system: 'https://terminology.hl7.org/CodeSystem/consentscope',
                code: 'research'
              }
            ]
          },
          category: [
            {
              coding: [
                {
                  system:
                    'https://terminology.hl7.org/CodeSystem/consentcategorycodes',
                  code: 'research'
                }
              ]
            }
          ],
          patient: { reference: `Patient/${patientId}` },
          policy: [
            {
              authority: 'https://konsulin.care/research',
              uri: 'https://konsulin.care/research/consent'
            }
          ]
        },
        request: { method: 'POST', url: 'Consent' }
      },
      {
        fullUrl: `urn:uuid:${crypto.randomUUID()}`,
        resource: {
          resourceType: 'ResearchSubject',
          status: 'on-study',
          study: { reference: `ResearchStudy/${studyId}` },
          individual: { reference: `Patient/${patientId}` },
          consent: { reference: consentFullUrl }
        },
        request: { method: 'POST', url: 'ResearchSubject' }
      }
    ]
  };
}

/**
 * Mutation that records a patient's consent to a study by posting a
 * Consent + ResearchSubject transaction bundle and refreshing the research
 * progress cache so the study is treated as consented.
 *
 * @param studyId - Bare ResearchStudy id being consented to.
 * @returns React Query mutation for the consent bundle POST.
 */
export function useConsentToStudy(studyId: string) {
  const queryClient = useQueryClient();
  const { state: authState } = useAuth();
  const fhirId = authState?.userInfo?.fhirId;

  return useMutation({
    mutationFn: (): Promise<Bundle> => {
      if (!fhirId)
        throw new Error('Patient identity required for research consent');
      return submitFhirBundle(buildConsentBundle(fhirId, studyId));
    },
    onSuccess: () => {
      // skipcq: JS-0098 - fire-and-forget cache invalidation
      void queryClient
        .invalidateQueries({ queryKey: ['research'] })
        .catch(() => {
          /* cache invalidation best-effort */
        });
    }
  });
}

/**
 * Claims a newly registered patient's localStorage guest consents as FHIR
 * Consent + ResearchSubject resources.
 *
 * Runs once per progress snapshot: for every study with a local consent flag
 * that is not yet backed by an on-study ResearchSubject, posts the consent
 * bundle and clears the flag on success. Failed or skipped studies keep their
 * flag so the claim retries on the next load. Guests (no fhirId) are ignored.
 *
 * @param studies - Active studies to claim consent for.
 * @param consentedStudyIds - Study ids already consented in FHIR.
 */
export function useClaimLocalConsents(
  studies: StudyProgress[],
  consentedStudyIds: ReadonlySet<string>
) {
  const queryClient = useQueryClient();
  const { state: authState } = useAuth();
  const fhirId = authState?.userInfo?.fhirId;
  const migrating = useRef(false);

  useEffect(() => {
    if (!fhirId || migrating.current) return;

    const pending = studies.filter(
      study =>
        readConsentFlag(window.localStorage, study.study.id) &&
        !consentedStudyIds.has(study.study.id)
    );
    if (pending.length === 0) return;

    migrating.current = true;
    // skipcq: JS-0098 - fire-and-forget consent claim; failed studies retry next load
    void (async () => {
      try {
        for (const study of pending) {
          try {
            await submitFhirBundle(buildConsentBundle(fhirId, study.study.id));
            clearConsentFlag(window.localStorage, study.study.id);
          } catch {
            // Keep the flag so the claim retries on a later page load.
          }
        }
        // skipcq: JS-0098 - fire-and-forget cache invalidation
        void queryClient
          .invalidateQueries({ queryKey: ['research'] })
          .catch(() => {
            /* cache invalidation best-effort */
          });
      } finally {
        migrating.current = false;
      }
    })();
  }, [consentedStudyIds, fhirId, queryClient, studies]);
}
