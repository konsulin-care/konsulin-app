'use client';

import { CollectiveGoal } from '@/app/research/collective-goal';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';
import { useResearchProgress } from '@/services/api/research';
import { latestResponsesByQuestionnaire } from '@/utils/fhir/report';
import { getNextBatch } from '@/utils/fhir/research-schedule';
import { ClipboardList, FileQuestion } from 'lucide-react';

import { ReportFab } from './report-fab';
import { ReportHero } from './report-hero';
import { ReportResult, type ReportResultItem } from './report-result';
import { ReportSaveCard } from './report-save-card';
import { BatchSection } from './report-sections';
import { ReportSkeleton } from './report-skeleton';
import { ReportTrail } from './report-trail';
import { useReportData } from './use-report-data';

/**
 * Research participation report for one study.
 *
 * Renders the completion headline (hero), the latest result per
 * questionnaire, the disclaimer, the guest save card, the collective goal
 * line, the batch trail with a one-line stats caption, and the
 * reverse-chronological batch history. The contextual Report FAB owns the
 * guest claim passthrough and the patient action priority.
 *
 * All data loading and aggregation lives in useReportData.
 */
export default function ReportView() {
  const t = useTranslations('common');
  const { state: authState } = useAuth();
  const isGuest = !authState.isAuthenticated;
  const { data: progress } = useResearchProgress();
  const {
    studyId,
    study,
    completedVisit,
    titleMap,
    responses,
    durationMap,
    isPatient,
    today,
    buckets,
    stats,
    latestBatchByQuestionnaire,
    sortedBatches,
    loading
  } = useReportData();

  if (loading) {
    return (
      <>
        <PageHeader
          pageIndicator={t('report.title')}
          backRoute={studyId ? `/research?id=${studyId}` : '/research'}
        />
        <ReportSkeleton />
      </>
    );
  }

  if (!studyId || !study) {
    return (
      <>
        <PageHeader pageIndicator={t('report.title')} backRoute='/research' />
        <div className='bg-card mt-[-24px] flex grow flex-col rounded-t-[16px] p-4'>
          <div
            data-testid='report-empty-not-found'
            className='flex min-h-[300px] flex-col items-center justify-center text-center'
          >
            <FileQuestion
              aria-hidden='true'
              className='text-muted-foreground mb-2 h-8 w-8'
            />
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
        <div className='bg-card mt-[-24px] flex grow flex-col rounded-t-[16px] p-4'>
          <div
            data-testid='report-empty-no-assessments'
            className='flex min-h-[300px] flex-col items-center justify-center text-center'
          >
            <ClipboardList
              aria-hidden='true'
              className='text-muted-foreground mb-2 h-8 w-8'
            />
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
  const nextBatch = getNextBatch(sortedBatches, today);
  const resultItems: ReportResultItem[] = [
    ...latestResponsesByQuestionnaire(responses)
  ].map(([questionnaireId, response]) => {
    const info = titleMap.get(questionnaireId);
    return {
      questionnaireId,
      title: info?.title ?? questionnaireId,
      response,
      instrument: info?.instrument ?? null
    };
  });
  const isConsented = studyId
    ? (progress?.consentedStudyIds ?? []).includes(studyId)
    : false;

  return (
    <>
      <PageHeader
        pageIndicator={t('report.title')}
        backRoute={`/research?id=${studyId}`}
      />
      <div
        data-testid='report-content'
        className='bg-card mt-[-24px] flex grow flex-col rounded-t-[16px] p-4 pb-28'
      >
        <ReportHero
          studyTitle={study.study.title}
          completed={completedVisit}
          today={today}
          batches={study.batches}
          buckets={buckets}
          durationByQuestionnaire={durationMap}
          isPatient={isPatient}
          latestBatchByQuestionnaire={latestBatchByQuestionnaire}
        />

        {isGuest && (
          <div className='mt-4'>
            <ReportSaveCard studyId={studyId} nextBatch={nextBatch} />
          </div>
        )}

        <ReportResult items={resultItems} />

        <footer
          data-testid='report-disclaimer'
          className='bg-muted text-muted-foreground mt-4 rounded-xl p-4 text-xs leading-relaxed'
        >
          {t('report.disclaimer')}
        </footer>

        <section data-testid='report-collective' className='mt-4'>
          <p className='text-foreground mb-2 text-sm font-semibold'>
            {t('report.thanks')}
          </p>
          <CollectiveGoal
            study={study.study}
            isGuest={isGuest}
            isConsented={isConsented}
          />
        </section>

        <div className='mt-4'>
          <ReportTrail study={study} stats={stats} today={today} />
        </div>

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
      </div>
      <ReportFab
        study={study}
        studyId={studyId}
        today={today}
        isGuest={isGuest}
        hasResponses={responses.length > 0}
        isPatient={isPatient}
        fhirId={authState.userInfo?.fhirId}
      />
    </>
  );
}
