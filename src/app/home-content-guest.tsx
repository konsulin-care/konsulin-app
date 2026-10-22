'use client';

import ActionCard from '@/components/general/action-card';
import GuestOnboardingSection from '@/components/general/home/guest-onboarding-section';
import RecommendationCardStack from '@/components/general/home/recommendation-card-stack';
import ScreeningDrawer from '@/components/screening-drawer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSavedRecommendation } from '@/hooks/useSavedRecommendation';
import { useTranslations } from '@/i18n';
import { useRecommendations } from '@/services/recommendations';
import { buildRecommendationParams } from '@/utils/recommendation-interview';
import { Building2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

/** Empty-state prompting the guest to start the screening interview. */
function EmptyRecommendationState({
  onStart,
  t
}: Readonly<{ onStart: () => void; t: (key: string) => string }>) {
  return (
    <div className='p-4'>
      <div className='rounded-2xl border border-dashed border-gray-300 bg-[#F9F9F9] p-6 text-center'>
        <Sparkles
          className='mx-auto mb-3 h-6 w-6 text-[var(--secondary)]'
          aria-hidden='true'
        />
        <p className='mb-1 text-[14px] font-bold text-gray-800'>
          {t('get_matched')}
        </p>
        <p className='mb-4 text-[12px] text-gray-500'>
          {t('start_assessment')}
        </p>
        <Button
          variant='default'
          onClick={onStart}
          className='bg-[var(--secondary)] text-white'
        >
          {t('start_assessment')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Guest home page: same persistent recommendation stack as the patient view
 * (driven by the saved IndexedDB screening result) plus login CTA.
 */
export default function HomeContentGuest() {
  const t = useTranslations('home');
  const router = useRouter();

  const {
    savedResult,
    coords,
    drawerOpen,
    openDrawer,
    closeDrawer,
    handleComplete
  } = useSavedRecommendation();

  const {
    data: recommendationsData,
    isLoading: isRecLoading,
    isError: isRecError
  } = useRecommendations(
    savedResult
      ? buildRecommendationParams(savedResult, coords?.lat, coords?.lon)
      : null
  );

  /** Redirect guest to auth page to book an appointment. */
  const handleBook = () => {
    router.push('/auth');
  };

  /** Renders the live recommendation stack, loading, or empty variants. */
  const renderRecommendations = () => {
    if (!savedResult) {
      return <EmptyRecommendationState onStart={openDrawer} t={t} />;
    }
    if (isRecLoading) {
      return (
        <div className='p-4'>
          <Skeleton className='aspect-square w-full rounded-2xl' />
        </div>
      );
    }
    if (
      isRecError ||
      (recommendationsData?.recommendations.length ?? 0) === 0
    ) {
      return (
        <div className='p-4'>
          <div className='rounded-2xl border border-dashed border-gray-300 bg-[#F9F9F9] p-6 text-center'>
            <p className='text-[12px] text-gray-500'>
              {isRecError ? t('no_recommendations') : t('no_practitioners')}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className='overflow-x-hidden p-0 pt-4'>
        <RecommendationCardStack
          recommendations={recommendationsData?.recommendations ?? []}
          onBook={handleBook}
        />
      </div>
    );
  };

  return (
    <>
      {/* PRIMARY: Persistent Recommendation Card Stack */}
      {renderRecommendations()}

      {/* UNIFIED SCREENING DRAWER */}
      <ScreeningDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onComplete={handleComplete}
      />

      {/* SECONDARY: Feature Onboarding */}
      <GuestOnboardingSection />

      {/* TERTIARY: Quick Actions */}
      <div className='px-4 pb-4'>
        <ActionCard
          icon={<Building2 className='h-5 w-5 text-gray-600' />}
          title={t('show_clinics')}
          description={t('login_browse')}
          href='/clinic'
        />
      </div>
    </>
  );
}
