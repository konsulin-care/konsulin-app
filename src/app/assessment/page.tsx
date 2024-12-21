'use client'

import ContentWraper from '@/components/general/content-wraper'
import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import { ChevronLeftIcon, SearchIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Assesment() {
  const questionnaire = require('./questionnaire/soap.json')
  const [keyWord, setKeyWord] = useState('')
  const router = useRouter()

  return (
    <>
      <NavigationBar />
      <Header>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />

          <div className='text-[14px] font-bold text-white'>
            Assesment Centre
          </div>
        </div>
      </Header>
      <ContentWraper className='p-4'>
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
      </ContentWraper>
    </>
  )
}
