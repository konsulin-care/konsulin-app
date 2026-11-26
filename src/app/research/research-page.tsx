'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageHeader from '@/components/page-header';
import PageLayout from '@/components/page-layout';
import { useReferralWrite } from '@/hooks/useReferralWrite';
import { useWaitingSubmissions } from '@/hooks/useWaitingSubmissions';
import { useTranslations } from '@/i18n';
import type { StudyProgress } from '@/utils/fhir/research';
import { readStudyProfile } from '@/utils/fhir/study-profile';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import ConsentDrawer from './consent-drawer';
import type { ConsentStudyProfile } from './consent-drawer-content';
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
 * Builds the consent drawer profile of the pending study.
 *
 * @param study - Progress of the study awaiting consent, when found.
 * @param fallbackGroup - Group name used when the study has no sponsor.
 * @returns The drawer profile, or undefined when no study is pending.
 */
function consentProfileOf(
  study: StudyProgress | undefined,
  fallbackGroup: string
): ConsentStudyProfile | undefined {
  if (!study) return undefined;
  const profile = readStudyProfile(study.study, '');
  return {
    title: study.study.title ?? '',
    groupName: profile.groupName ?? fallbackGroup,
    leadName: profile.leadName ?? '',
    batchCount: study.batches.length
  };
}

/**
 * Research hub: the participant home or the researcher carousel, with the
 * consent drawer that gates participation for patients and guests alike.
 */
export default function ResearchPage() {
  const router = useRouter();
  const t = useTranslations('research');
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
    effectiveActiveId,
    fhirId,
    isResearcher,
    consentedStudyIds: progressConsentedIds
  } = useResearchPageData(activeStudyId);
  const practitionerId = fhirId;
  const isPatient = Boolean(fhirId);
  useReferralWrite(progress);

  const waiting = useWaitingSubmissions();

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
    activeStudy: null,
    participate,
    router
  });

  const { handleSlideChange, handleResearcherStudyClick } = useResearchHandlers(
    {
      studies,
      detailStudyId: noDetailStudy(),
      isConsented,
      setActiveStudyId,
      setDetailStudyId: ignoreDetailStudy,
      setPendingConsent,
      router
    }
  );

  const handleStart = useCallback(
    (study: StudyProgress, questionnaireId: string) => {
      participate(study, questionnaireId);
    },
    [participate]
  );

  const pendingStudy = pendingConsent
    ? studies.find(entry => entry.study.id === pendingConsent.studyId)
    : undefined;
  const consentProfile = consentProfileOf(
    pendingStudy,
    t('side_facts.run_by_fallback')
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
              activeStudyId={effectiveActiveId}
              practitionerId={practitionerId}
              waiting={waiting}
              consentedStudyIds={consentedStudyIds}
              onStart={handleStart}
              onSlideChange={handleSlideChange}
              onResearcherStudyClick={handleResearcherStudyClick}
            />
          </div>
        </ContentWraper>
      </PageLayout>
      <ConsentDrawer
        open={pendingConsent !== null}
        onClose={() => setPendingConsent(null)}
        onAgree={handleAgree}
        profile={consentProfile}
      />
    </>
  );
}
