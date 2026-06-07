'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageLoader from '@/components/general/page-loader';
import Share from '@/components/general/share';
import PageHeader from '@/components/page-header';
import { useGetExercise } from '@/services/api/exercise';
import { useSearchParams } from 'next/navigation';

/** Single exercise detail page with iframe player and description. */
export default function ExerciseDetail() {
  const searchParams = useSearchParams();
  const exerciseId = searchParams.get('exerciseId') ?? '';

  const { data, isLoading: excerciseIsLoading } = useGetExercise();

  const excerciseData =
    Array.isArray(data) && data?.find(item => item?.id === exerciseId);

  return (
    <>
      <PageHeader pageIndicator={excerciseData?.title} />

      <ContentWraper className='p-4'>
        {excerciseIsLoading && !excerciseData ? (
          <PageLoader />
        ) : (
          <>
            <iframe
              style={{ borderRadius: '12px' }}
              src={excerciseData.url}
              width='100%'
              height='352'
              title={excerciseData?.title || 'Exercise video'}
              allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
              loading='lazy'
              sandbox='allow-scripts allow-popups'
            />
            <div className='mt-4 mb-4 flex w-full items-center justify-between'>
              <span className='text-[12px] font-bold'>Excersise Brief</span>
              <Share />
            </div>
            <div className='text-[12px] font-normal'>
              {excerciseData.description}
            </div>
          </>
        )}
      </ContentWraper>
    </>
  );
}
