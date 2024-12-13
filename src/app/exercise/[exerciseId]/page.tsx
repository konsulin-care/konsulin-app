'use client'

import ContentWraper from '@/components/general/content-wraper'
import Share from '@/components/general/share'
import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { getExceriseList } from '@/services/api/exercise'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export interface IDetailExerciserProps {
  params: { exerciseId: string }
}

export default function DetailExercise({ params }: IDetailExerciserProps) {
  const router = useRouter()

  const { data, isLoading: excerciseIsLoading } = useQuery({
    queryKey: ['getExceriseList'],
    queryFn: getExceriseList
  })

  const excerciseData = data?.find(item => item?.id === params.exerciseId)

  useEffect(() => {
    console.log({ data, excerciseData })
  }, [data, excerciseData])

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
        {(!excerciseIsLoading || excerciseData) && (
          <>
            <iframe
              style={{ borderRadius: '12px' }}
              src={excerciseData.url}
              width='100%'
              height='352'
              allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
              loading='lazy'
            />
            <div className='mb-4 mt-4 flex w-full items-center justify-between'>
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
  )
}
