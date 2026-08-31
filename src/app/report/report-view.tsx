'use client';

import ClaimReportFab from '@/components/assessment/claim-report-fab';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
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
import { extractQuestionnaireId, sortBatches } from '@/utils/fhir/research';
import type { QuestionnaireResponse } from 'fhir/r4';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import {
  BatchSection,
  CLAIM_REPORT_NUDGE,
  ParticipationCard,
  REPORT_DISCLAIMER
} from './report-sections';

/**
 * Research participation report for one study.
 *
 * Renders the study header, participation summary, reverse-chronological
 * batch sections with per-questionnaire score cards, and a disclaimer.
 * Guests get a claim nudge with the shared Claim Report FAB.
 */
export default function ReportView() {
  const searchParams = useSearchParams();
  const studyId = searchParams.get('id');
  const { state: authState } = useAuth();
  const isGuest = !authState.isAuthenticated;

  const { data: progress, isLoading: progressLoading } = useResearchProgress({
    skipResponseSearch: true
  });
  const study = useMemo(
    () => progress?.studies.find(item => item.study.id === studyId) ?? null,
    [progress, studyId]
  );

  const questionnaireIds = useMemo(
    () =>
      study
        ? [...new Set(study.batches.flatMap(batch => batch.questionnaireIds))]
        : [],
    [study]
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
    useQuestionnaireTitles(questionnaireIds);
  const { data: responses, isLoading: responsesLoading } = useReportResponses(
    questionnaireIds,
    since,
    until
  );

  const buckets = useMemo(
    () =>
      study && responses
        ? deduplicateBuckets(bucketResponsesByBatch(responses, study.batches))
        : new Map<string, QuestionnaireResponse[]>(),
    [study, responses]
  );

  const stats = useMemo(() => {
    if (!study || !responses) return null;
    const durationMap = new Map(
      [...titleMap].map(([id, info]) => [id, info.durationMinutes])
    );
    return computeParticipationStats(study, responses, durationMap);
  }, [study, responses, titleMap]);

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
        <PageHeader pageIndicator='Research Report' backRoute='/research' />
        <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
          <div className='flex min-h-[300px] items-center justify-center'>
            <p className='text-muted-foreground text-sm'>Report not found</p>
          </div>
        </div>
      </>
    );
  }

  if (!responses || responses.length === 0) {
    return (
      <>
        <PageHeader
          pageIndicator='Research Report'
          backRoute={`/research?id=${studyId}`}
        />
        <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
          <div className='flex min-h-[300px] items-center justify-center'>
            <p className='text-muted-foreground text-sm'>
              No completed assessments yet
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
        pageIndicator='Research Report'
        backRoute={`/research?id=${studyId}`}
      />
      <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
        <div className='mb-4'>
          <h1
            data-testid='report-study-title'
            className='text-xl font-bold text-black'
          >
            {study.study.title}
          </h1>
        </div>

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

        {isGuest && (
          <div className='border-secondary/30 bg-secondary/5 mb-4 rounded-xl border p-4 text-center'>
            <p
              data-testid='report-claim-nudge'
              className='text-xs text-gray-600'
            >
              {CLAIM_REPORT_NUDGE}
            </p>
          </div>
        )}

        <footer
          data-testid='report-disclaimer'
          className='mt-auto rounded-xl bg-gray-50 p-4 text-[11px] leading-relaxed text-gray-500'
        >
          {REPORT_DISCLAIMER}
        </footer>
      </div>
      <ClaimReportFab
        path={`/report?id=${studyId}`}
        visible={isGuest && responses.length > 0}
      />
    </>
  );
}
