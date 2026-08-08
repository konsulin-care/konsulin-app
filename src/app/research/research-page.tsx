'use client';

import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import PageHeader from '@/components/page-header';
import ReferralNotice from '@/components/research/referral-notice';
import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { useReferralWrite } from '@/hooks/useReferralWrite';
import { useQuestionnaireTitles } from '@/services/api/questionnaire-info';
import {
  useClaimLocalConsents,
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
import ResearchSkeleton from './research-skeleton';
import {
  resolveDeepLinks,
  resolveFocusTarget,
  updateResearchUrl
} from './research-url';
import StudyDetailView from './study-detail-view';
import { buildOverlapMap } from './study-sections';

/** Target of the consent drawer: the study and the questionnaire to open next. */
interface PendingConsent {
  studyId: string;
  questionnaireId?: string;
}

/**
 * Research hub: study carousel, contribution dashboard, and detail drawer.
 * Participation is consent-gated for patients and guests alike.
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

  /** Every questionnaire id deployed by current batches or completed before. */
  const questionnaireIds = useMemo(
    () => [
      ...new Set([
        ...studies.flatMap(study => study.currentBatch?.questionnaireIds ?? []),
        ...(progress?.completedQuestionnaireIds ?? [])
      ])
    ],
    [studies, progress?.completedQuestionnaireIds]
  );
  const { data: titleMap = {}, isPending: titlesPending } =
    useQuestionnaireTitles(questionnaireIds);

  const detailStudy = studies.find(s => s.study.id === detailStudyId) ?? null;
  // Resolve the active study and detail drawer from `?id=` / `?view=`:
  // `id` focuses the carousel, `view` also opens the detail drawer.
  useEffect(() => {
    const { knownId, knownView } = resolveDeepLinks(searchParams, studies);

    // Invalid deep link: drop the unknown params, keeping valid ones and ref.
    if (
      (searchParams.get('id') && !knownId) ||
      (searchParams.get('view') && !knownView)
    ) {
      router.replace(
        updateResearchUrl(searchParams, {
          id: knownId ? knownId.study.id : null,
          view: knownView ? knownView.study.id : null
        })
      );
    }

    const targetId = resolveFocusTarget(
      knownId,
      knownView,
      activeStudyId,
      studies
    );
    if (targetId !== activeStudyId) {
      setActiveStudyId(targetId);
    }

    // Drawer: a valid view param opens the study detail drawer.
    if (knownView && knownView.study.id !== detailStudyId) {
      setDetailStudyId(knownView.study.id);
    }
  }, [searchParams, studies, router, activeStudyId, detailStudyId]);

  const activeStudy = studies.find(s => s.study.id === activeStudyId) ?? null;

  /** Study ids the patient has already consented to in FHIR. */
  const consentedStudyIds = useMemo(
    () => new Set(progress?.consentedStudyIds),
    [progress]
  );

  // Migrate a patient's localStorage guest consents into FHIR (idempotent).
  useClaimLocalConsents(studies, consentedStudyIds);

  /** True when consent was recorded: FHIR ResearchSubject or localStorage. */
  const isConsented = useCallback(
    (studyId: string) =>
      isPatient
        ? consentedStudyIds.has(studyId)
        : readConsentFlag(window.localStorage, studyId),
    [consentedStudyIds, isPatient]
  );

  /**
   * Participate entry point for every action: consented studies navigate
   * directly, others open the consent drawer for the target questionnaire.
   */
  const participate = useCallback(
    (study: StudyProgress | null, questionnaireId?: string) => {
      if (!study) return;
      const target = questionnaireId ?? study.firstUncompletedQuestionnaireId;
      if (isConsented(study.study.id)) {
        if (target) {
          router.push(`/assessments?id=${target}&study=${study.study.id}`);
        }
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
   * Records consent for the pending study, then navigates to its target
   * questionnaire. Patients POST a Consent + ResearchSubject bundle.
   */
  const handleAgree = useCallback(() => {
    if (!pendingConsent) return;
    const { studyId, questionnaireId } = pendingConsent;
    const study = studies.find(entry => entry.study.id === studyId);
    const target =
      questionnaireId ?? study?.firstUncompletedQuestionnaireId ?? null;

    const finish = () => {
      setPendingConsent(null);
      if (target) {
        router.push(`/assessments?id=${target}&study=${studyId}`);
      }
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

  // Morph the FAB into a Participate action continuing the active slide's
  // study. Cleared when nothing can be participated in or on unmount.
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

  /** Updates the URL to deep-link the newly active slide, keeping view/ref. */
  const handleSlideChange = (studyId: string) => {
    setActiveStudyId(studyId);
    // Programmatic syncs (deep links, back/forward) already carry the id.
    if (searchParams.get('id') === studyId) return;
    router.replace(updateResearchUrl(searchParams, { id: studyId }));
  };

  /** Opens the study detail drawer, or redirects to the report when the batch is done. */
  const handleStudyClick = (studyId: string) => {
    const study = studies.find(entry => entry.study.id === studyId);
    if (study?.isComplete) {
      router.push(`/report?id=${studyId}`);
      return;
    }
    setDetailStudyId(studyId);
    if (searchParams.get('view') === studyId) return;
    router.replace(updateResearchUrl(searchParams, { view: studyId }));
  };

  /** Navigates to the study report; used by the drawer's See Report CTA. */
  const handleSeeReport = (studyId: string) => {
    router.push(`/report?id=${studyId}`);
  };

  /** Closes the detail drawer and removes its `view` param, keeping id/ref. */
  const handleDrawerClose = () => {
    setDetailStudyId(null);
    if (searchParams.get('view')) {
      router.replace(updateResearchUrl(searchParams, { view: null }));
    }
  };

  /** Renders the loading, error, or study content for the page. */
  const renderContent = () => {
    if (isLoading) {
      return <ResearchSkeleton />;
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
          onStudyClick={handleStudyClick}
          onQuestionnaireClick={handleQuestionnaireClick}
          isPatient={isPatient}
          fhirId={fhirId}
          titleMap={titleMap}
          isTitlesLoading={titlesPending}
        />
        <ContributionDashboard
          progress={progress}
          activeStudy={activeStudy}
          questionnaireInfo={titleMap}
        />
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
        onClose={handleDrawerClose}
        onParticipate={participate}
        onSeeReport={handleSeeReport}
        onQuestionnaireClick={handleQuestionnaireClick}
        isPatient={isPatient}
        fhirId={fhirId}
        titleMap={titleMap}
        isTitlesLoading={titlesPending}
      />
      <ConsentDrawer
        open={pendingConsent !== null}
        onClose={() => setPendingConsent(null)}
        onAgree={handleAgree}
      />
    </>
  );
}
