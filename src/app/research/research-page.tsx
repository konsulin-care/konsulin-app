'use client';

import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import ShareCard from '@/components/research/share-card';
import { useAuth } from '@/context/auth/authContext';
import { useFab } from '@/context/fabContext';
import { useResearchProgress } from '@/services/api/research';
import { FlaskConical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import BatchTimeline from './batch-timeline';
import ContributionDashboard from './contribution-dashboard';
import ResearchHero from './research-hero';
import StudyComposition from './study-composition';

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
        Participation is voluntary. Responses are anonymized and used only for
        research purposes. You can stop participating at any time.
      </p>
    </section>
  );
}

/** Research hub page: hero, batch timeline, contribution dashboard, composition. */
export default function ResearchPage() {
  const router = useRouter();
  const { dispatch } = useFab();
  const { state: authState } = useAuth();
  const fhirId = authState?.userInfo?.fhirId;
  const { data: progress, isLoading } = useResearchProgress();

  // Morph the global FAB into a Participate action that continues the first
  // hero study. Cleared when nothing can be participated in or on unmount.
  useEffect(() => {
    const first = progress?.studies[0];
    const firstUncompleted = first?.firstUncompletedQuestionnaireId;

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
  }, [progress, dispatch, router]);

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
        <ResearchHero studies={progress.studies} />
        <ShareCard isPatient={Boolean(fhirId)} fhirId={fhirId} />
        <BatchTimeline studies={progress.studies} />
        <ContributionDashboard progress={progress} />
        <StudyComposition studies={progress.studies} />
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
