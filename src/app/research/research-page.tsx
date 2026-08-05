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
import { useResearchProgress } from '@/services/api/research';
import { FlaskConical } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ContributionDashboard from './contribution-dashboard';
import ResearchCarousel from './research-carousel';

/** Static how-it-works and privacy explainer for the research page. */
function HowItWorksSection() {
  return (
    <section className='card mt-4 border-0 bg-[#F9F9F9] p-4'>
      <h2 className='text-sm font-bold text-gray-700'>How it works</h2>
      <ul className='mt-2 list-disc pl-4 text-xs text-gray-600'>
        <li>
          Every questionnaire you complete counts toward the ongoing study.
        </li>
        <li>
          Each batch runs for a fixed period with a small questionnaire set.
        </li>
        <li>
          Complete the batch before it closes to keep your participation streak.
        </li>
      </ul>
      <p className='mt-3 text-[10px] text-gray-500'>
        Participation is voluntary and pseudonymized, not anonymized: your
        responses are linked to your identity so you can track your own
        contribution. Referral patterns are used to study the structure of the
        research community. You can review your data, stop participating, or
        request deletion at any time.
      </p>
    </section>
  );
}

/**
 * Research hub page: carousel of active studies, contribution dashboard,
 * circle panel, and explainer. The carousel slide drives the Participate FAB
 * and the URL `?id=` param for deep links and sharing.
 */
export default function ResearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dispatch } = useFab();
  const { state: authState } = useAuth();
  const fhirId = authState?.userInfo?.fhirId;
  const { data: progress, isLoading } = useResearchProgress();
  useReferralWrite(progress);

  const studies = useMemo(() => progress?.studies ?? [], [progress]);
  const [activeStudyId, setActiveStudyId] = useState<string | null>(null);

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
          onAction: () => router.push(`/assessments?id=${firstUncompleted}`)
        }
      });
    } else {
      dispatch({ type: 'SET_ACTION', config: null });
    }

    return () => dispatch({ type: 'SET_ACTION', config: null });
  }, [activeStudy, dispatch, router]);

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
          isPatient={Boolean(fhirId)}
          fhirId={fhirId}
        />
        <ContributionDashboard progress={progress} activeStudy={activeStudy} />
        <CirclePanel isPatient={Boolean(fhirId)} fhirId={fhirId} />
        <HowItWorksSection />
      </>
    );
  };

  return (
    <>
      <PageHeader />
      <ContentWraper className='pt-4'>
        <div className='px-4'>{renderContent()}</div>
      </ContentWraper>
    </>
  );
}
