'use client';

import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import CirclePanel from '@/components/research/circle-panel';
import ReferralNotice from '@/components/research/referral-notice';
import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { useReferralWrite } from '@/hooks/useReferralWrite';
import {
  useConsentToStudy,
  useResearchProgress
} from '@/services/api/research';
import { readConsentFlag, writeConsentFlag } from '@/utils/consent';
import type { StudyProgress } from '@/utils/fhir/research';
import { FlaskConical } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import ConsentDrawer from './consent-drawer';
import ContributionDashboard from './contribution-dashboard';
import ResearchCarousel from './research-carousel';
import StudyDetailView from './study-detail-view';
import { buildOverlapMap } from './study-sections';

/** Target of the consent drawer: the study and the questionnaire to open next. */
interface PendingConsent {
  studyId: string;
  questionnaireId?: string;
}

/**
 * Research hub page: carousel of active studies, contribution dashboard,
 * circle panel, and the study detail view. Participation is consent-gated:
 * patients persist Consent + ResearchSubject per study, guests use
 * localStorage flags, and the consent drawer opens once per study.
 */
export default function ResearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dispatch } = useFab();
  const { state: authState } = useAuth();
  const fhirId = authState?.userInfo?.fhirId;
  const isPatient = Boolean(fhirId);
  const { data: progress, isLoading } = useResearchProgress();
  useReferralWrite(progress);

  const studies = useMemo(() => progress?.studies ?? [], [progress]);
  const [activeStudyId, setActiveStudyId] = useState<string | null>(null);
  const [detailStudyId, setDetailStudyId] = useState<string | null>(null);
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(
    null
  );
  const overlapMap = useMemo(() => buildOverlapMap(studies), [studies]);

  const detailStudy =
    studies.find(study => study.study.id === detailStudyId) ?? null;

  // Resolve the active study from the `?id=` param. An unknown or inactive id
  // silently falls back to the first study and the URL is cleaned. A
  // user-swiped active study is left untouched unless the URL says otherwise.
  useEffect(() => {
    const requestedId = searchParams.get('id');
    const known = requestedId
      ? studies.find(study => study.study.id === requestedId)
      : undefined;

    // Invalid deep link: drop the unknown id, keeping any referral ref.
    if (requestedId && !known) {
      const ref = searchParams.get('ref');
      router.replace(
        ref ? `/research?ref=${encodeURIComponent(ref)}` : '/research'
      );
    }

    const targetId =
      known?.study.id ??
      (activeStudyId && studies.some(study => study.study.id === activeStudyId)
        ? activeStudyId
        : (studies[0]?.study.id ?? null));

    if (targetId !== activeStudyId) {
      setActiveStudyId(targetId);
    }
  }, [searchParams, studies, router, activeStudyId]);

  const activeStudy =
    studies.find(study => study.study.id === activeStudyId) ?? null;

  /** Study ids the patient has already consented to in FHIR. */
  const consentedStudyIds = useMemo(
    () => new Set(progress?.consentedStudyIds),
    [progress]
  );

  /**
   * True when consent was recorded for a study: FHIR ResearchSubject for
   * patients, localStorage flag for guests.
   */
  const isConsented = useCallback(
    (studyId: string) =>
      isPatient
        ? consentedStudyIds.has(studyId)
        : readConsentFlag(window.localStorage, studyId),
    [consentedStudyIds, isPatient]
  );

  /**
   * Entry point for every participate action (FAB, study-view CTA,
   * questionnaire rows): consented studies navigate directly, others open
   * the consent drawer with the questionnaire to open after agreeing.
   */
  const participate = useCallback(
    (study: StudyProgress | null, questionnaireId?: string) => {
      if (!study) return;
      const target = questionnaireId ?? study.firstUncompletedQuestionnaireId;
      if (isConsented(study.study.id)) {
        if (target) router.push(`/assessments?id=${target}`);
        return;
      }
      setPendingConsent({ studyId: study.study.id, questionnaireId });
    },
    [isConsented, router]
  );

  /** Mutation bound to the study currently being consented to. */
  const pendingStudyId = pendingConsent?.studyId ?? '';
  const consentMutation = useConsentToStudy(pendingStudyId);

  /**
   * Records consent for the pending study and navigates to its target
   * questionnaire. Patients POST a Consent + ResearchSubject bundle (toast
   * on failure); guests write a localStorage flag.
   */
  const handleAgree = useCallback(() => {
    if (!pendingConsent) return;
    const { studyId, questionnaireId } = pendingConsent;
    const study = studies.find(entry => entry.study.id === studyId);
    const target =
      questionnaireId ?? study?.firstUncompletedQuestionnaireId ?? null;

    const finish = () => {
      setPendingConsent(null);
      if (target) router.push(`/assessments?id=${target}`);
    };

    if (isPatient) {
      consentMutation.mutate(undefined, {
        onSuccess: finish,
        onError: () => {
          toast.error('Could not record your consent. Please try again.');
        }
      });
      return;
    }

    writeConsentFlag(window.localStorage, studyId);
    finish();
  }, [consentMutation, isPatient, pendingConsent, router, studies]);

  // Morph the global FAB into a Participate action that continues the active
  // slide's study. Cleared when nothing can be participated in or on unmount.
  useEffect(() => {
    const firstUncompleted = activeStudy?.firstUncompletedQuestionnaireId;

    if (firstUncompleted) {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: 'Participate',
          icon: FlaskConical,
          onAction: () => participate(activeStudy)
        }
      });
    } else {
      dispatch({ type: 'SET_ACTION', config: null });
    }

    return () => dispatch({ type: 'SET_ACTION', config: null });
  }, [activeStudy, dispatch, participate]);

  /** Consent-aware navigation for questionnaire rows on /research. */
  const handleQuestionnaireClick = useCallback(
    (studyId: string, questionnaireId: string) => {
      const study = studies.find(entry => entry.study.id === studyId);
      participate(study ?? null, questionnaireId);
    },
    [participate, studies]
  );

  /** Updates the URL to deep-link the newly active slide, keeping any ref. */
  const handleSlideChange = (studyId: string) => {
    setActiveStudyId(studyId);
    // Programmatic syncs (deep links, back/forward) already carry the id.
    if (searchParams.get('id') === studyId) return;
    const ref = searchParams.get('ref');
    router.replace(
      ref
        ? `/research?id=${studyId}&ref=${encodeURIComponent(ref)}`
        : `/research?id=${studyId}`
    );
  };

  /** Renders the loading, error, or study content for the page. */
  const renderContent = () => {
    if (isLoading) {
      return (
        <div
          data-testid='research-loading'
          className='flex min-h-[60vh] items-center justify-center'
        >
          <LoadingSpinnerIcon width={48} height={48} className='animate-spin' />
        </div>
      );
    }
    if (!progress || progress.studies.length === 0) {
      return (
        <EmptyState
          className='py-16'
          title='No ongoing research'
          subtitle='There are currently no research studies available. Please check back later.'
        />
      );
    }
    return (
      <>
        <ReferralNotice />
        <ResearchCarousel
          studies={studies}
          activeId={activeStudyId ?? ''}
          onSlideChange={handleSlideChange}
          onStudyClick={setDetailStudyId}
          onQuestionnaireClick={handleQuestionnaireClick}
          isPatient={isPatient}
          fhirId={fhirId}
        />
        <ContributionDashboard progress={progress} activeStudy={activeStudy} />
        <CirclePanel isPatient={isPatient} fhirId={fhirId} />
      </>
    );
  };

  return (
    <>
      <PageHeader />
      <ContentWraper className='pt-4'>
        <div className='px-4'>{renderContent()}</div>
      </ContentWraper>
      <StudyDetailView
        progress={detailStudy}
        overlapMap={overlapMap}
        open={detailStudy !== null}
        onClose={() => setDetailStudyId(null)}
        onParticipate={participate}
        onQuestionnaireClick={handleQuestionnaireClick}
        isPatient={isPatient}
        fhirId={fhirId}
      />
      <ConsentDrawer
        open={pendingConsent !== null}
        onClose={() => setPendingConsent(null)}
        onAgree={handleAgree}
      />
    </>
  );
}
