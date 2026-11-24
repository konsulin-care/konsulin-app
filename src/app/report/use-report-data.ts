'use client';

import { useResearchXp } from '@/hooks/useResearchXp';
import {
  EMPTY_QUESTIONNAIRE_INFO_MAP,
  useQuestionnaireTitles,
  type QuestionnaireInfo
} from '@/services/api/questionnaire-info';
import { useReportResponses } from '@/services/api/report';
import { useResearchProgress } from '@/services/api/research';
import {
  bucketResponsesByBatch,
  computeParticipationStats,
  deduplicateBuckets,
  type ParticipationStats
} from '@/utils/fhir/report';
import {
  extractQuestionnaireId,
  sortBatches,
  type ResearchBatch,
  type ResearchProgress,
  type StudyProgress
} from '@/utils/fhir/research';
import { format } from 'date-fns';
import type { QuestionnaireResponse } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

/** Progress placeholder before the query resolves; keeps useResearchXp total. */
const EMPTY_PROGRESS: ResearchProgress = {
  studies: [],
  cumulativeResponses: 0,
  questionnaireResponses: [],
  questionnaireXp: 0,
  completedQuestionnaireIds: [],
  consentedStudyIds: []
};

/** Data and derived aggregates backing the research report for one study. */
export interface ReportData {
  /** Study id from the `id` search param, or null. */
  studyId: string | null;
  /** The matching study progress entry, or null when absent/loading. */
  study: StudyProgress | null;
  /** Latched completion state for this visit (URL flag stripped after). */
  completedVisit: boolean;
  /** Distinct questionnaire ids deployed across the study's batches. */
  questionnaireIds: string[];
  /** Questionnaires whose titles are needed for the hero XP math. */
  titleIds: string[];
  /** Earliest batch start, or null when the study has no batches. */
  since: string | null;
  /** Latest batch end, or null when the study has no batches. */
  until: string | null;
  /** Resolved titles and durations per questionnaire. */
  titleMap: ReadonlyMap<string, QuestionnaireInfo>;
  /** Completed responses scoped to the study, or undefined before load. */
  responses: QuestionnaireResponse[] | undefined;
  /** Questionnaire id to estimated duration in minutes. */
  durationMap: Map<string, number | null>;
  /** Questionnaire XP plus converted referral XP. */
  totalXp: number;
  /** Whether the signed-in user has a FHIR id (guests do not). */
  isPatient: boolean;
  /** Current local date, yyyy-mm-dd. */
  today: string;
  /** De-duplicated responses keyed by batch id. */
  buckets: Map<string, QuestionnaireResponse[]>;
  /** Participation statistics, or null before data resolves. */
  stats: ParticipationStats | null;
  /** Batch id of the newest response per questionnaire (trend anchor). */
  latestBatchByQuestionnaire: Map<string, string>;
  /** The study's batches sorted by start ascending. */
  sortedBatches: ResearchBatch[];
  /** True while progress or the scoped response search is still loading. */
  loading: boolean;
}

/**
 * Loads and derives the data for the research report of one study.
 *
 * Reads the `id` and `completed` search params, resolves the study from the
 * research progress payload, latches the completion state for the visit while
 * stripping the URL flag, and scopes the response search to the study's date
 * range. All aggregation (buckets, stats, XP, trend anchors) is memoised so
 * the view only renders.
 *
 * @returns Study, responses, and every aggregate the report view renders.
 */
export function useReportData(): ReportData {
  const searchParams = useSearchParams();
  const router = useRouter();
  const studyId = searchParams.get('id');
  const completed = searchParams.get('completed') === '1';

  // The hero's global XP needs the full progress payload, so no
  // structure-only shortcut here.
  const { data: progress, isLoading: progressLoading } = useResearchProgress();
  const study = useMemo(
    () => progress?.studies.find(item => item.study.id === studyId) ?? null,
    [progress, studyId]
  );

  // The completion state is latched for the visit: the URL flag is stripped
  // so a reload shows the plain study title, but the strip lands while the
  // report is still loading and must not drop the hero's completion headline.
  const [completedVisit, setCompletedVisit] = useState(completed);
  useEffect(() => {
    if (completed && studyId) {
      setCompletedVisit(true);
      router.replace(`/report?id=${studyId}`);
    }
  }, [completed, studyId, router]);

  const questionnaireIds = useMemo(
    () =>
      study
        ? [...new Set(study.batches.flatMap(batch => batch.questionnaireIds))]
        : [],
    [study]
  );
  // Titles cover the study's batch questionnaires plus every questionnaire
  // the progress payload awarded XP for, so the hero's XP math resolves.
  const titleIds = useMemo(
    () => [
      ...new Set([
        ...questionnaireIds,
        ...(progress?.questionnaireResponses ?? [])
      ])
    ],
    [questionnaireIds, progress]
  );
  // Earliest batch start bounds the response search so pre-study responses
  // authored under the same identity are excluded from the payload.
  const since = useMemo(
    () =>
      study && study.batches.length > 0
        ? study.batches
            .map(batch => batch.start)
            .toSorted((a, b) => a.localeCompare(b))[0]
        : null,
    [study]
  );
  // Latest batch end caps the response search so post-study responses
  // are excluded from the payload.
  const until = useMemo(
    () =>
      study && study.batches.length > 0
        ? study.batches
            .map(batch => batch.end)
            .toSorted((a, b) => b.localeCompare(a))[0]
        : null,
    [study]
  );
  const { data: titleMap = EMPTY_QUESTIONNAIRE_INFO_MAP } =
    useQuestionnaireTitles(titleIds);
  const { data: responses, isLoading: responsesLoading } = useReportResponses(
    questionnaireIds,
    since,
    until
  );

  const durationMap = useMemo(
    () =>
      new Map([...titleMap].map(([id, info]) => [id, info.durationMinutes])),
    [titleMap]
  );
  const { totalXp, isPatient } = useResearchXp(
    progress ?? EMPTY_PROGRESS,
    titleMap
  );
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const buckets = useMemo(
    () =>
      study && responses
        ? deduplicateBuckets(bucketResponsesByBatch(responses, study.batches))
        : new Map<string, QuestionnaireResponse[]>(),
    [study, responses]
  );

  const stats = useMemo(() => {
    if (!study || !responses) return null;
    return computeParticipationStats(study, responses, durationMap);
  }, [study, responses, durationMap]);

  const latestBatchByQuestionnaire = useMemo(() => {
    const map = new Map<string, string>();
    if (!study) return map;
    for (const batch of study.batches) {
      for (const response of buckets.get(batch.id) ?? []) {
        const questionnaireId = extractQuestionnaireId(response.questionnaire);
        if (!questionnaireId) continue;
        const previous = map.get(questionnaireId);
        const previousStart = previous
          ? (study.batches.find(item => item.id === previous)?.start ?? '')
          : '';
        if (!previous || batch.start > previousStart) {
          map.set(questionnaireId, batch.id);
        }
      }
    }
    return map;
  }, [study, buckets]);

  const sortedBatches = useMemo(
    () => (study ? sortBatches(study.batches) : []),
    [study]
  );

  const loading =
    progressLoading ||
    (study !== null && responsesLoading && responses === undefined);

  return {
    studyId,
    study,
    completedVisit,
    questionnaireIds,
    titleIds,
    since,
    until,
    titleMap,
    responses,
    durationMap,
    totalXp,
    isPatient,
    today,
    buckets,
    stats,
    latestBatchByQuestionnaire,
    sortedBatches,
    loading
  };
}
