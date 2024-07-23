'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import { SearchIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const Exercise: React.FC<IWithAuth> = ({ userRole, isAuthenticated }) => {
  return (
    <NavigationBar>
      <Header
        showChat={false}
        moreAction={
          <Link href='/'>
            <Image
              width={32}
              height={32}
              alt='offline'
              src={'/icons/bookmark.svg'}
            />
          </Link>
        }
      >
        {!isAuthenticated ? (
          <div className='mt-5'></div>
        ) : (
          <div className='flex'>
            <Image
              className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
              width={32}
              height={32}
              alt='offline'
              src={'/images/avatar.jpg'}
            />
            <div className='flex flex-col'>
              <div className='text-[10px] font-normal text-white'>
                Selamat Datang di Dashboard anda
              </div>
              <div className='text-[14px] font-bold text-white'>
                Aji Si {userRole}
              </div>
            </div>
          </div>
        )}
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        {/* Filter / Search */}
        <div className='p-4'>
          <InputWithIcon
            placeholder='Search'
            className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
            startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
          />
        </div>

        {/* Recommended Exercises  */}
        <div className='bg-[#F9F9F9] p-4'>
          <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
            Recommended Exercises
          </div>
          <div className='text-[10px] font-normal text-[hsla(220,9%,19%,0.6)]'>
            Based on your turbulence data
          </div>
        </div>

        {/* Other */}
        <div className='p-4'>
          <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
            Other
          </div>
        </div>
      </div>
    </NavigationBar>
  )
}

export default withAuth(Exercise, ['patient', 'clinician'], true)
