'use client'

import Header from '@/components/header'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/auth/authContext'
import Image from 'next/image'
import { useEffect } from 'react'

export default function HomeHeader() {
  const { state: authState, isLoading: isLoadingAuth } = useAuth()

  useEffect(() => {
    console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL)
  }, [])

  return (
    <Header>
      <div className='h-[32px]'>
        {isLoadingAuth ? (
          <div className='flex items-center space-x-4'>
            <Skeleton className='h-[32px] w-[32px] rounded-full' />
            <div className='space-y-2'>
              <Skeleton className='h-[10px] w-[250px]' />
              <Skeleton className='h-[14px] w-[200px]' />
            </div>
          </div>
        ) : !authState.isAuthenticated ? (
          <div className='flex flex-col'>
            <div className='text-[14px] font-bold text-white'>Konsulin</div>
          </div>
        ) : (
          <div className='flex'>
            {!authState.userInfo.profile_picture ? (
              <div className='mr-2 rounded-full bg-white p-[2px]'>
                <Image
                  className='h-[32px] w-[32px] self-center rounded-full object-cover'
                  width={32}
                  height={32}
                  alt='profile_picture'
                  src={`/favicon/favicon-32x32.png`}
                />
              </div>
            ) : (
              <Image
                className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
                width={32}
                height={32}
                alt='profile_picture'
                src={authState.userInfo.profile_picture}
              />
            )}
            <div className='flex flex-col'>
              <div className='text-[10px] font-normal text-white'>
                Selamat Datang di Dashboard anda
              </div>
              <div className='text-[14px] font-bold text-white'>
                {authState.userInfo.fullname}
              </div>
            </div>
          </div>
        )}
      </div>
    </Header>
  )
}
