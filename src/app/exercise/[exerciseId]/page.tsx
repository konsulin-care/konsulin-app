'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageLoader from '@/components/general/page-loader';
import Share from '@/components/general/share';
import Header from '@/components/header';
import NavigationBar from '@/components/navigation-bar';
import { useGetExercise } from '@/services/api/exercise';
import { ChevronLeftIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface IDetailExerciserProps {
  params: { exerciseId: string };
}

export default function DetailExercise({ params }: IDetailExerciserProps) {
  const router = useRouter();

  const { data, isLoading: excerciseIsLoading } = useGetExercise();

  const excerciseData =
    Array.isArray(data) && data?.find(item => item?.id === params.exerciseId);

  return (
    <>
      <NavigationBar />
      <Header showChat={false} showNotification={false}>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />

          <div className='w-full text-center text-[14px] font-bold text-white'>
            {excerciseData?.title}
          </div>
        </div>
      </Header>

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
              allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
              loading='lazy'
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
