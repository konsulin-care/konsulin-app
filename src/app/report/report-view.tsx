'use client';

import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';

import { ReportFab } from './report-fab';
import { ReportHero } from './report-hero';
import { BatchSection, ParticipationCard } from './report-sections';
import { useReportData } from './use-report-data';

/**
 * Research participation report for one study.
 *
 * Renders the hero (completion headline or study title, level bar, timeline,
 * next-batch line), the participation summary, reverse-chronological batch
 * sections with per-questionnaire score cards, and a disclaimer. The
 * contextual Report FAB owns the guest claim passthrough and the patient
 * action priority (continue, remind, share).
 *
 * All data loading and aggregation lives in useReportData.
 */
export default function ReportView() {
  const t = useTranslations('common');
  const { state: authState } = useAuth();
  const isGuest = !authState.isAuthenticated;
  const {
    studyId,
    study,
    completedVisit,
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
  } = useReportData();

  if (loading) return null;

  if (!studyId || !study) {
    return (
      <>
        <PageHeader pageIndicator={t('report.title')} backRoute='/research' />
        <div className='bg-card mt-[-24px] flex grow flex-col rounded-t-[16px] p-4'>
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
        <div className='bg-card mt-[-24px] flex grow flex-col rounded-t-[16px] p-4'>
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
      <div className='bg-card mt-[-24px] flex grow flex-col rounded-t-[16px] p-4'>
        <ReportHero
          studyTitle={study.study.title}
          completed={completedVisit}
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
          className='bg-muted text-muted-foreground mt-auto rounded-xl p-4 text-xs leading-relaxed'
        >
          {t('report.disclaimer')}
        </footer>
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
