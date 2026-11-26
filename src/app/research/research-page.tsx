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
import type { ComponentType } from 'react';
import { useCallback, useState } from 'react';
import ConsentDrawer from './consent-drawer';
import type { ConsentStudyProfile } from './consent-drawer-content';
import { useLegacyStudyRedirect } from './legacy-study-redirect';
import ResearchContent, { type ResearchContentProps } from './research-content';
import { useConsent } from './use-consent';
import { useResearchFabAction } from './use-fab-action';
import { useParticipate } from './use-participate';
import { useResearchPageData } from './use-research-page-data';

/** Target of the consent drawer: the study and the questionnaire to open next. */
interface PendingConsent {
  studyId: string;
  questionnaireId?: string;
}

/**
 * Research content props left once the researcher carousel is gone: the home
 * no longer needs a focused study id or slide callbacks.
 */
type CarouselFreeResearchContentProps = Omit<
  ResearchContentProps,
  | 'activeStudyId'
  | 'practitionerId'
  | 'onSlideChange'
  | 'onResearcherStudyClick'
>;

/** Research content viewed without the retired researcher carousel props. */
const CarouselFreeResearchContent =
  ResearchContent as ComponentType<CarouselFreeResearchContentProps>;

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
 * Research hub: the participant home or the researcher home, with the consent
 * drawer that gates participation for patients and guests alike.
 */
export default function ResearchPage() {
  const router = useRouter();
  const t = useTranslations('research');
  useLegacyStudyRedirect();
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(
    null
  );
  const {
    progress,
    isLoading,
    studies,
    researcherStudies,
    researcherLoading,
    fhirId,
    isResearcher,
    consentedStudyIds: progressConsentedIds
  } = useResearchPageData(null);
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
            <CarouselFreeResearchContent
              isResearcher={isResearcher}
              researcherLoading={researcherLoading}
              researcherStudies={researcherStudies}
              isLoading={isLoading}
              waiting={waiting}
              consentedStudyIds={consentedStudyIds}
              onStart={handleStart}
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
