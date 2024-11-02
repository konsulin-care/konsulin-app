'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import { SearchIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const Assesment: React.FC<IWithAuth> = ({ userRole, isAuthenticated }) => {
  const questionnaire = require('./questionnaire/soap.json')
  const [keyWord, setKeyWord] = useState('')

  return (
    <NavigationBar>
      <Header>
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
      <div className='mt-[-24px] min-h-screen rounded-[16px] bg-white p-4'>
        <InputWithIcon
          value={keyWord}
          onChange={e => setKeyWord(e.target.value)}
          placeholder='Search Asessment'
          className='mb-4 mr-4 h-[50px] w-full rounded-[16px] border-0 bg-[#F9F9F9] text-primary'
          startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
        />

        <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
          Browse Instruments
        </div>

        <div className='mt-4 grid grid-cols-1 gap-2 md:grid-cols-2'>
          {Array(6)
            .fill(undefined)
            .map((_, index: number) => (
              <Link
                key={index}
                href={`assessment/${123}`}
                className='card item flex flex-col p-2'
              >
                <div className='flex items-center'>
                  <div className='mr-2 h-[40px] w-[40px] rounded-full bg-[#F8F8F8] p-2'>
                    <Image
                      className='h-[24px] w-[24px] object-cover'
                      src={'/images/note.svg'}
                      width={24}
                      height={24}
                      alt='note'
                    />
                  </div>
                  <div className='text-[12px] text-[hsla(220,9%,19%,1)]'>
                    BIG 5 Personality Test
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </NavigationBar>
  )
}

export default withAuth(Assesment, ['patient', 'clinician'], true)
