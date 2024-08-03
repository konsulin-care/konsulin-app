'use client'

import Share from '@/components/general/share'
import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import withAuth from '@/hooks/withAuth'
import { getExceriseList } from '@/services/api/excercise'
import { useQuery } from '@tanstack/react-query'
import { BookmarkIcon, ChevronLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ReactPlayer from 'react-player'

export interface IDetailExerciserProps {
  IWithAuth
  params: { exerciseId: string }
}

const DetailExercise: React.FC<IDetailExerciserProps> = ({ params }) => {
  const router = useRouter()

  const { data, isLoading: excerciseIsLoading } = useQuery({
    queryKey: ['getExceriseList'],
    queryFn: getExceriseList
  })

  const excerciseData = data?.find(
    item => item?.youtube_id === params.exerciseId
  )

  useEffect(() => {
    console.log({ data, excerciseData })
  }, [data, excerciseData])

  return (
    <NavigationBar>
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
      <div className='mt-[-24px] min-h-screen rounded-[16px] bg-white p-4'>
        <div className='z-10 rounded-lg'>
          <ReactPlayer
            className='z-1'
            controls={true}
            width='100%'
            url={`https://www.youtube.com/watch?v=${params.exerciseId}`}
            config={{ file: { forceAudio: true } }}
          />
        </div>
        <div className='mb-4 mt-4 flex w-full items-center'>
          <div className='mt-4 text-[12px] font-bold'>Excersise Brief</div>

          <div className='ml-auto flex items-center'>
            <Share />
            <div className='ml-4 h-[24px] w-min cursor-pointer rounded-[8px] bg-[#13C2C2] p-1'>
              <BookmarkIcon color='white' height={16} width={16} fill='white' />
            </div>
          </div>
        </div>
        {(!excerciseIsLoading || excerciseData) && (
          <div className='text-[12px] font-normal'>
            {excerciseData.description}
          </div>
        )}
      </div>
    </NavigationBar>
  )
}

export default withAuth(DetailExercise, ['patient'], true)
