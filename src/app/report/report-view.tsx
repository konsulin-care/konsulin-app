'use client';

import ClaimReportFab from '@/components/assessment/claim-report-fab';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
import { useResearchXp } from '@/hooks/useResearchXp';
import { useTranslations } from '@/i18n';
import {
  EMPTY_QUESTIONNAIRE_INFO_MAP,
  useQuestionnaireTitles
} from '@/services/api/questionnaire-info';
import { useReportResponses } from '@/services/api/report';
import { useResearchProgress } from '@/services/api/research';
import {
  bucketResponsesByBatch,
  computeParticipationStats,
  deduplicateBuckets
} from '@/utils/fhir/report';
import {
  extractQuestionnaireId,
  sortBatches,
  type ResearchProgress
} from '@/utils/fhir/research';
import { format } from 'date-fns';
import type { QuestionnaireResponse } from 'fhir/r4';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import { ReportHero } from './report-hero';
import { BatchSection, ParticipationCard } from './report-sections';

/** Progress placeholder before the query resolves; keeps useResearchXp total. */
const EMPTY_PROGRESS: ResearchProgress = {
  studies: [],
  cumulativeResponses: 0,
  questionnaireResponses: [],
  questionnaireXp: 0,
  completedQuestionnaireIds: [],
  consentedStudyIds: []
};

/**
 * Research participation report for one study.
 *
 * Renders the hero (completion headline or study title, level bar, timeline,
 * next-batch line), the participation summary, reverse-chronological batch
 * sections with per-questionnaire score cards, and a disclaimer. Guests get
 * a claim nudge in the hero with the shared Claim Report FAB.
 */
export default function ReportView() {
  const t = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const studyId = searchParams.get('id');
  const completed = searchParams.get('completed') === '1';
  const { state: authState } = useAuth();
  const isGuest = !authState.isAuthenticated;

  // The hero's global XP needs the full progress payload, so no
  // structure-only shortcut here.
  const { data: progress, isLoading: progressLoading } = useResearchProgress();
  const study = useMemo(
    () => progress?.studies.find(item => item.study.id === studyId) ?? null,
    [progress, studyId]
  );

  // Strips the batch-completion flag after the hero has announced it, so a
  // reload shows the plain study title.
  useEffect(() => {
    if (completed && studyId) {
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

  /** Batch id of the newest response per questionnaire (trend anchor). */
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

  if (loading) return null;

  if (!studyId || !study) {
    return (
      <>
        <PageHeader pageIndicator={t('report.title')} backRoute='/research' />
        <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
          <div className='flex min-h-[300px] items-center justify-center'>
            <p className='text-muted-foreground text-sm'>
              {t('report.not_found')}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <>
        <PageHeader
          pageIndicator={t('report.title')}
          backRoute={`/research?id=${studyId}`}
        />
        <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
          <div className='flex min-h-[300px] items-center justify-center'>
            <p className='text-muted-foreground text-sm'>
              {t('report.no_assessments')}
            </p>
          </div>
        </div>
      </>
    );
  }

  const hasCompletedBatches = [...buckets.values()].some(
    batchResponses => batchResponses.length > 0
  );

  return (
    <>
      <PageHeader
        pageIndicator={t('report.title')}
        backRoute={`/research?id=${studyId}`}
      />
      <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
        <ReportHero
          studyTitle={study.study.title}
          completed={completed}
          today={today}
          batches={study.batches}
          buckets={buckets}
          durationByQuestionnaire={durationMap}
          totalXp={totalXp}
          isPatient={isPatient}
          latestBatchByQuestionnaire={latestBatchByQuestionnaire}
        />

        {stats && <ParticipationCard stats={stats} />}

        {hasCompletedBatches &&
          [...sortedBatches].toReversed().map(batch => {
            const batchResponses = buckets.get(batch.id) ?? [];
            if (batchResponses.length === 0) return null;
            return (
              <BatchSection
                key={batch.id}
                batch={batch}
                sortedBatches={sortedBatches}
                responses={batchResponses}
                titleMap={titleMap}
                buckets={buckets}
                latestBatchByQuestionnaire={latestBatchByQuestionnaire}
              />
            );
          })}

        <footer
          data-testid='report-disclaimer'
          className='mt-auto rounded-xl bg-gray-50 p-4 text-[11px] leading-relaxed text-gray-500'
        >
          {t('report.disclaimer')}
        </footer>
      </div>
      <ClaimReportFab
        path={`/report?id=${studyId}`}
        visible={isGuest && responses.length > 0}
      />
    </>
  );
}
