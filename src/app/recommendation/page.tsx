'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import ScreeningDrawer from '@/components/screening-drawer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecommendations } from '@/services/recommendations';
import type { InterviewResult } from '@/types/recommendation-interview';
import {
  buildRecommendationParams,
  readLastInterviewResult
} from '@/utils/recommendation-interview';
import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import RecommendationCard from './recommendation-card';

/**
 * Empty-state: prompt the user to complete a screening before
 * any recommendations can be loaded.
 */
function NoRecommendationsPrompt({
  onOpenDrawer
}: Readonly<{ onOpenDrawer: () => void }>) {
  return (
    <div className='flex min-h-[300px] flex-col items-center justify-center gap-3 px-6 text-center'>
      <Sparkles
        className='h-6 w-6 text-[var(--secondary)]'
        aria-hidden='true'
      />
      <p className='text-sm font-medium text-gray-800'>
        Start a screening to see recommendations
      </p>
      <p className='text-xs text-gray-500'>
        Complete a short assessment and we&apos;ll match you with the right
        practitioner.
      </p>
      <Button
        variant='default'
        onClick={onOpenDrawer}
        className='bg-[var(--secondary)] text-white'
      >
        Start Screening
      </Button>
    </div>
  );
}

/**
 * Recommendation results page (`/recommendation`).
 *
 * Reads the saved screening result from IndexedDB and fetches
 * matching practitioner recommendations from the BFF. No URL
 * parameters required — all state is persisted client-side.
 */
export default function RecommendationPage() {
  const [savedResult, setSavedResult] = useState<InterviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await readLastInterviewResult();
        if (active) {
          setSavedResult(result);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const params = savedResult ? buildRecommendationParams(savedResult) : null;

  const { data, isLoading, isError, refetch } = useRecommendations(params);

  const recommendations = data?.recommendations ?? [];
  const specialty = savedResult?.specialty ?? '';

  const handleComplete = useCallback((result: InterviewResult) => {
    setSavedResult(result);
    setDrawerOpen(false);
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader pageIndicator='Rekomendasi' backRoute='/' />
        <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
          <Skeleton className='mb-4 h-6 w-40' />
          <Skeleton className='h-[200px] w-full rounded-xl' />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader pageIndicator='Rekomendasi' backRoute='/' />

      <div className='mt-[-24px] flex grow flex-col rounded-t-[16px] bg-white p-4'>
        {!savedResult && (
          <NoRecommendationsPrompt onOpenDrawer={() => setDrawerOpen(true)} />
        )}

        {savedResult && (
          <>
            <h1 className='text-lg font-semibold'>{specialty}</h1>
            {renderBody()}
          </>
        )}
      </div>

      <ScreeningDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onComplete={handleComplete}
      />
    </>
  );

  function renderBody() {
    if (isLoading) {
      return (
        <div className='flex min-h-[300px] items-center justify-center'>
          <LoadingSpinnerIcon
            width={40}
            height={40}
            className='w-full animate-spin'
          />
        </div>
      );
    }
    if (isError) {
      return (
        <div className='flex min-h-[300px] flex-col items-center justify-center gap-3 text-center'>
          <p className='text-sm text-red-600'>
            Gagal memuat rekomendasi. Silakan coba lagi.
          </p>
          <Button
            variant='outline'
            onClick={() => {
              void refetch();
            }}
          >
            Coba Lagi
          </Button>
        </div>
      );
    }
    if (recommendations.length === 0) {
      return (
        <div className='flex min-h-[300px] items-center justify-center'>
          <p className='text-muted-foreground text-sm'>
            Belum ada rekomendasi untuk spesialisasi ini.
          </p>
        </div>
      );
    }
    return (
      <div className='mt-4 flex flex-col gap-3 pb-6'>
        {recommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.practitionerRoleId}
            recommendation={recommendation}
          />
        ))}
      </div>
    );
  }
}
