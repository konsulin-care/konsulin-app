'use client';

import { useRuntimeConfig } from '@/components/general/runtime-config-provider';
import { useAuth } from '@/context/auth/authContext';
import {
  useWaitingSubmissions,
  type WaitingResponse
} from '@/hooks/useWaitingSubmissions';
import {
  EMPTY_QUESTIONNAIRE_INFO_MAP,
  useQuestionnaireTitles,
  type QuestionnaireInfo
} from '@/services/api/questionnaire-info';
import { useResearchProgress } from '@/services/api/research';
import { COMPLETION_COUNT_FLOOR } from '@/services/api/research-counts';
import { readConsentFlag } from '@/utils/consent';
import {
  buildFindingsFeed,
  type FindingsFeedItem
} from '@/utils/fhir/findings-feed';
import {
  extractQuestionnaireId,
  type StudyProgress
} from '@/utils/fhir/research';
import { sortCatalogue } from '@/utils/fhir/research-catalogue-order';
import type { GivenTotals } from '@/utils/fhir/research-contribution';
import { buildUpNextQueue, type UpNextItem } from '@/utils/fhir/research-queue';
import {
  studyStatus,
  type StudyStatusResult
} from '@/utils/fhir/research-status';
import { readStudyProfile } from '@/utils/fhir/study-profile';
import { format } from 'date-fns';
import { useMemo } from 'react';

/** Stable empty inputs so memo dependencies keep a constant identity. */
const EMPTY_STUDIES: StudyProgress[] = [];
const EMPTY_IDS: string[] = [];
/** Active catalogue split into the two open-to-join shelves. */
export interface ParticipantHomeShelves {
  konsulin: StudyProgress[];
  others: StudyProgress[];
  total: number;
}
/** Where the guest save banner points. */
export interface GuestBannerTarget {
  authored: string;
  studyId: string;
}

/** View data of the participant home. */
export interface ParticipantHomeData {
  scopedStudies: StudyProgress[];
  joinedIds: string[];
  catalogue: StudyProgress[];
  shelves: ParticipantHomeShelves;
  queue: UpNextItem[];
  totals: GivenTotals;
  statuses: ReadonlyMap<string, StudyStatusResult>;
  findings: FindingsFeedItem[];
  guestBanner: GuestBannerTarget | null;
  titleMap: ReadonlyMap<string, QuestionnaireInfo>;
  isLoading: boolean;
  titlesPending: boolean;
  isError: boolean;
  isGuest: boolean;
  konsulinOrganizationId: string;
  today: string;
}

function joinedStudyIds(
  studies: readonly StudyProgress[],
  consentedIds: readonly string[],
  isPatient: boolean,
  storage?: Storage
): string[] {
  if (isPatient) return [...consentedIds];
  const fallback = typeof window === 'undefined' ? null : window.localStorage;
  const target = storage ?? fallback;
  if (!target) return [];
  return studies
    .map(study => study.study.id ?? '')
    .filter(id => id.length > 0 && readConsentFlag(target, id));
}

/** Splits unjoined catalogue studies into the two shelves, keeping order. */
function shelvesOf(
  catalogue: readonly StudyProgress[],
  joined: ReadonlySet<string>,
  konsulinOrganizationId: string
): ParticipantHomeShelves {
  const konsulin: StudyProgress[] = [];
  const others: StudyProgress[] = [];
  for (const study of catalogue) {
    if (joined.has(study.study.id ?? '')) continue;
    const profile = readStudyProfile(study.study, konsulinOrganizationId);
    if (profile.isKonsulin) konsulin.push(study);
    else others.push(study);
  }
  return { konsulin, others, total: konsulin.length + others.length };
}

/** Accumulates one batch; reports whether it held completed answers. */
function accumulateBatch(
  ids: readonly string[],
  completedIds: ReadonlySet<string>,
  titleMap: ReadonlyMap<string, QuestionnaireInfo>,
  seen: Set<string>
): { any: boolean; minutes: number } {
  let any = false;
  let minutes = 0;
  for (const id of ids) {
    if (!completedIds.has(id)) continue;
    any = true;
    if (seen.has(id)) continue;
    seen.add(id);
    minutes += titleMap.get(id)?.durationMinutes ?? 0;
  }
  return { any, minutes };
}

/** Totals of what the participant gave in joined studies, from progress. */
function totalsOf(
  joined: readonly StudyProgress[],
  completedIds: ReadonlySet<string>,
  titleMap: ReadonlyMap<string, QuestionnaireInfo>
): GivenTotals {
  const seen = new Set<string>();
  let minutes = 0;
  let studies = 0;
  for (const progress of joined) {
    let any = progress.history.some(entry => entry.participated);
    for (const batch of progress.batches) {
      const result = accumulateBatch(
        batch.questionnaireIds,
        completedIds,
        titleMap,
        seen
      );
      any = any || result.any;
      minutes += result.minutes;
    }
    if (any) studies += 1;
  }
  return { questionnairesShared: seen.size, minutes, studies };
}

/** Status per joined study; a queued answer counts as completed but unsynced. */
function statusesOf(
  joined: readonly StudyProgress[],
  waitingIds: ReadonlySet<string>,
  today: string
): Map<string, StudyStatusResult> {
  const statuses = new Map<string, StudyStatusResult>();
  for (const progress of joined) {
    const current = progress.currentBatch;
    const waiting = new Set<string>();
    if (current?.questionnaireIds.some(id => waitingIds.has(id))) {
      waiting.add(current.id);
    }
    const participatedBatchIds = progress.history
      .filter(entry => entry.participated)
      .map(entry => entry.batchId);
    statuses.set(
      progress.study.id ?? '',
      studyStatus({
        study: { batches: progress.batches, participatedBatchIds },
        joined: true,
        waitingIds: waiting,
        today
      })
    );
  }
  return statuses;
}

/** Newest queued guest response and the study it belongs to, when any. */
function guestBannerOf(
  waiting: readonly WaitingResponse[],
  studies: readonly StudyProgress[],
  isGuest: boolean
): GuestBannerTarget | null {
  if (!isGuest) return null;
  let newest: GuestBannerTarget | null = null;
  for (const entry of waiting) {
    const questionnaireId = extractQuestionnaireId(entry.questionnaire);
    if (!entry.authored || !questionnaireId) continue;
    const study = studies.find(item =>
      item.batches.some(batch =>
        batch.questionnaireIds.includes(questionnaireId)
      )
    );
    const studyId = study?.study.id;
    if (!studyId) continue;
    if (!newest || Date.parse(entry.authored) > Date.parse(newest.authored)) {
      newest = { authored: entry.authored, studyId };
    }
  }
  return newest;
}

function titleIdsOf(
  studies: readonly StudyProgress[],
  waitingIds: readonly string[]
): string[] {
  const ids = studies.flatMap(study =>
    study.batches.flatMap(batch => batch.questionnaireIds)
  );
  return [...new Set([...ids, ...waitingIds])];
}

/**
 * Composes the participant home view data: scoped progress of joined studies,
 * catalogue shelves, queue, totals, per-study status, the findings feed, the
 * guest banner target and the loading flags.
 *
 * @returns The composed participant home data.
 */
export function useParticipantHome(): ParticipantHomeData {
  const { state: authState } = useAuth();
  const isPatient = Boolean(authState?.userInfo?.fhirId);
  const { konsulinOrganizationId = '' } = useRuntimeConfig();
  const { data: progress, isLoading, isError } = useResearchProgress();
  const waiting = useWaitingSubmissions();
  const studies = progress?.studies ?? EMPTY_STUDIES;
  const consentedIds = progress?.consentedStudyIds ?? EMPTY_IDS;
  const joinedIds = useMemo(
    () => joinedStudyIds(studies, consentedIds, isPatient),
    [studies, consentedIds, isPatient]
  );
  const joinedSet = useMemo(() => new Set(joinedIds), [joinedIds]);
  const scopedStudies = useMemo(
    () => studies.filter(study => joinedSet.has(study.study.id ?? '')),
    [studies, joinedSet]
  );
  const catalogue = useMemo(
    () => sortCatalogue(studies, konsulinOrganizationId),
    [studies, konsulinOrganizationId]
  );
  const shelves = useMemo(
    () => shelvesOf(catalogue, joinedSet, konsulinOrganizationId),
    [catalogue, joinedSet, konsulinOrganizationId]
  );
  const waitingIds = useMemo(
    () =>
      waiting
        .map(entry => extractQuestionnaireId(entry.questionnaire))
        .filter((id): id is string => id !== null),
    [waiting]
  );
  const waitingSet = useMemo(() => new Set(waitingIds), [waitingIds]);
  const titleIds = useMemo(
    () => titleIdsOf(studies, waitingIds),
    [studies, waitingIds]
  );
  const {
    data: titleMap = EMPTY_QUESTIONNAIRE_INFO_MAP,
    isPending: titlesPending
  } = useQuestionnaireTitles(titleIds);
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const queue = useMemo(
    () =>
      buildUpNextQueue({
        studies: scopedStudies,
        joinedIds,
        waitingIds,
        today
      }),
    [scopedStudies, joinedIds, waitingIds, today]
  );
  const totals = useMemo(
    () =>
      totalsOf(
        scopedStudies,
        new Set(progress?.completedQuestionnaireIds ?? EMPTY_IDS),
        titleMap
      ),
    [scopedStudies, progress, titleMap]
  );
  const statuses = useMemo(
    () => statusesOf(scopedStudies, waitingSet, today),
    [scopedStudies, waitingSet, today]
  );
  const findings = useMemo(
    () =>
      buildFindingsFeed({
        studies: studies.map(study => study.study),
        joinedIds,
        floor: COMPLETION_COUNT_FLOOR,
        konsulinOrgId: konsulinOrganizationId
      }),
    [studies, joinedIds, konsulinOrganizationId]
  );
  const guestBanner = useMemo(
    () => guestBannerOf(waiting, studies, !isPatient),
    [waiting, studies, isPatient]
  );

  return {
    scopedStudies,
    joinedIds,
    catalogue,
    shelves,
    queue,
    totals,
    statuses,
    findings,
    guestBanner,
    titleMap,
    isLoading,
    titlesPending,
    isError,
    isGuest: !isPatient,
    konsulinOrganizationId,
    today
  };
}
