'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageHeader from '@/components/page-header';
import PageLayout from '@/components/page-layout';
import { useReferralWrite } from '@/hooks/useReferralWrite';
import { useWaitingSubmissions } from '@/hooks/useWaitingSubmissions';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import ConsentDrawer from './consent-drawer';
import { useLegacyStudyRedirect } from './legacy-study-redirect';
import ResearchContent from './research-content';
import { useConsent } from './use-consent';
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
 * Placeholder detail id: the home page no longer opens a detail drawer.
 *
 * @returns Always null.
 */
function noDetailStudy(): string | null {
  return null;
}

/**
 * Placeholder detail setter: the home page no longer opens a detail drawer.
 */
function ignoreDetailStudy(): void {
  // The detail drawer was replaced by the standalone study page.
}

/**
 * Research hub: study carousel, contribution dashboard, and consent drawer.
 * Participation is consent-gated for patients and guests alike.
 */
export default function ResearchPage() {
  const router = useRouter();
  useLegacyStudyRedirect();
  const [activeStudyId, setActiveStudyId] = useState<string | null>(null);
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
    isResearcher,
    consentedStudyIds: progressConsentedIds
  } = useResearchPageData(activeStudyId);
  const practitionerId = fhirId;
  const isPatient = Boolean(fhirId);
  useReferralWrite(progress);

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

  const { handleSlideChange, handleResearcherStudyClick, handleStudyClick } =
    useResearchHandlers({
      studies,
      detailStudyId: noDetailStudy(),
      isConsented,
      setActiveStudyId,
      setDetailStudyId: ignoreDetailStudy,
      setPendingConsent,
      router
    });

  const handleQuestionnaireClick = useCallback(
    (studyId: string, questionnaireId: string) => {
      const study = studies.find(entry => entry.study.id === studyId);
      participate(study ?? null, questionnaireId);
    },
    [participate, studies]
  );

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
      <ConsentDrawer
        open={pendingConsent !== null}
        onClose={() => setPendingConsent(null)}
        onAgree={handleAgree}
      />
    </>
  );
}
