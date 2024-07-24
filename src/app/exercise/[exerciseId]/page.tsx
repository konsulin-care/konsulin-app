'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import withAuth from '@/hooks/withAuth'
import { ChevronLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface IDetailExerciserProps {
  IWithAuth
  params: { exerciseId: string }
}

const DetailExercise: React.FC<IDetailExerciserProps> = ({ params }) => {
  const router = useRouter()

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
            Title Excercise - {params.exerciseId}
          </div>
        </div>
      </Header>
      <div className='mt-[-24px] min-h-screen rounded-[16px] bg-white p-4'>
        {/* Filter / Search */}
        <h1> {params.exerciseId}</h1>
      </div>
    </NavigationBar>
  )
}

export default withAuth(DetailExercise, ['patient'], true)
