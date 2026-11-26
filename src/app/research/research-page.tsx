'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageHeader from '@/components/page-header';
import PageLayout from '@/components/page-layout';
import { useReferralWrite } from '@/hooks/useReferralWrite';
import type { WaitingResponse } from '@/hooks/useWaitingSubmissions';
import { useWaitingSubmissions } from '@/hooks/useWaitingSubmissions';
import type { StudyProgress } from '@/utils/fhir/research';
import { waitingBatchIds } from '@/utils/fhir/research-schedule';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import ConsentDrawer from './consent-drawer';
import { useLegacyStudyRedirect } from './legacy-study-redirect';
import ResearchContent from './research-content';
import StudyDetailView from './study-detail-view';
import { buildOverlapMap } from './study-sections';
import { useConsent } from './use-consent';
import { useDetailStudy } from './use-detail-study';
import { useResearchFabAction } from './use-fab-action';
import { useParticipate } from './use-participate';
import { useResearchHandlers } from './use-research-handlers';
import { useResearchPageData } from './use-research-page-data';

/** Target of the consent drawer: the study and the questionnaire to open next. */
interface PendingConsent {
  studyId: string;
  questionnaireId?: string;
}

/**
 * Derives the detail drawer's consent and waiting-batch props.
 *
 * @param detailStudy Study currently shown in the detail drawer, if any.
 * @param waiting Queued questionnaire responses awaiting synchronization.
 * @param isConsented Consent predicate for a study id.
 * @returns Consent flag and waiting batch ids for the open study.
 */
function buildDetailLinks(
  detailStudy: StudyProgress | null,
  waiting: readonly WaitingResponse[],
  isConsented: (studyId: string) => boolean
): { isConsented: boolean; waitingBatchIds?: ReadonlySet<string> } {
  if (!detailStudy) return { isConsented: false };
  return {
    isConsented: isConsented(detailStudy.study.id),
    waitingBatchIds: waitingBatchIds(detailStudy.batches, waiting)
  };
}

/**
 * Research hub: study carousel, contribution dashboard, and detail drawer.
 * Participation is consent-gated for patients and guests alike.
 */
export default function ResearchPage() {
  const router = useRouter();
  useLegacyStudyRedirect();
  const [activeStudyId, setActiveStudyId] = useState<string | null>(null);
  const [detailStudyId, setDetailStudyId] = useState<string | null>(null);
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(
    null
  );
  const {
    progress,
    isLoading,
    studies,
    researcherStudies,
    researcherLoading,
    titleMap,
    titlesPending,
    effectiveActiveId,
    fhirId,
    roleName,
    isResearcher,
    consentedStudyIds: progressConsentedIds
  } = useResearchPageData(activeStudyId);
  const practitionerId = fhirId;
  const isPatient = Boolean(fhirId);
  useReferralWrite(progress);
  const overlapMap = useMemo(() => buildOverlapMap(studies), [studies]);

  const detailStudy = useDetailStudy({
    isResearcher,
    detailStudyId,
    studies,
    researcherStudies
  });

  const waiting = useWaitingSubmissions();

  const activeStudy = studies.find(s => s.study.id === effectiveActiveId);

  const { consentedStudyIds, isConsented, handleAgree } = useConsent({
    isPatient,
    studies,
    consentedStudyIds: progressConsentedIds,
    pendingConsent,
    setPendingConsent,
    router
  });

  const participate = useParticipate({
    isConsented,
    setPendingConsent,
    router
  });

  useResearchFabAction({
    isResearcher,
    activeStudy: activeStudy ?? null,
    participate,
    router
  });

  const {
    handleSlideChange,
    handleResearcherStudyClick,
    handleStudyClick,
    handleSeeReport,
    handleDrawerClose
  } = useResearchHandlers({
    studies,
    detailStudyId,
    isConsented,
    setActiveStudyId,
    setDetailStudyId,
    setPendingConsent,
    router
  });

  const handleManageStudy = useCallback(
    (studyId: string) => {
      router.push(`/research/edit?id=${studyId}&page=title`);
    },
    [router]
  );

  const handleQuestionnaireClick = useCallback(
    (studyId: string, questionnaireId: string) => {
      const study = studies.find(entry => entry.study.id === studyId);
      participate(study ?? null, questionnaireId);
    },
    [participate, studies]
  );

  const detailLinks = buildDetailLinks(detailStudy, waiting, isConsented);

  return (
    <>
      <PageLayout variant='wide'>
        <PageHeader />
        <ContentWraper className='pt-4'>
          <div className='px-4'>
            <ResearchContent
              isResearcher={isResearcher}
              researcherLoading={researcherLoading}
              researcherStudies={researcherStudies}
              isLoading={isLoading}
              progress={progress}
              studies={studies}
              activeStudyId={effectiveActiveId}
              activeStudy={activeStudy ?? null}
              titleMap={titleMap}
              titlesPending={titlesPending}
              fhirId={fhirId}
              practitionerId={practitionerId}
              waiting={waiting}
              consentedStudyIds={consentedStudyIds}
              onSlideChange={handleSlideChange}
              onResearcherStudyClick={handleResearcherStudyClick}
              onStudyClick={handleStudyClick}
              onQuestionnaireClick={handleQuestionnaireClick}
            />
          </div>
        </ContentWraper>
      </PageLayout>
      <StudyDetailView
        progress={detailStudy}
        overlapMap={overlapMap}
        open={detailStudy !== null}
        onClose={handleDrawerClose}
        onParticipate={participate}
        onSeeReport={handleSeeReport}
        onQuestionnaireClick={handleQuestionnaireClick}
        onManageStudy={handleManageStudy}
        isPatient={isPatient}
        isConsented={detailLinks.isConsented}
        waitingBatchIds={detailLinks.waitingBatchIds}
        fhirId={fhirId}
        titleMap={titleMap}
        isTitlesLoading={titlesPending}
        roleName={roleName}
      />
      <ConsentDrawer
        open={pendingConsent !== null}
        onClose={() => setPendingConsent(null)}
        onAgree={handleAgree}
      />
    </>
  );
}
