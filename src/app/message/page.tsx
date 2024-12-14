'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { ChevronLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Message() {
  const router = useRouter()

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
            Message
          </div>
        </div>
      </Header>
      <div className='mt-[-24px] min-h-screen rounded-[16px] bg-white p-4'>
        <div>Message</div>
      </div>
    </>
  )
}
