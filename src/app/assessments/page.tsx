'use client'

import BackButton from '@/components/general/back-button'
import CardLoader from '@/components/general/card-loader'
import ContentWraper from '@/components/general/content-wraper'
import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { useListAssessments } from '@/services/api/assessment'
import Image from 'next/image'
import Link from 'next/link'

export default function Assessment() {
  const { data: assessments, isLoading } = useListAssessments()
  return (
    <>
      <NavigationBar />
      <Header>
        <div className='flex w-full items-center'>
          <BackButton />
          <div className='text-[14px] font-bold text-white'>
            Assesment Centre
          </div>
        </div>
      </Header>

      <ContentWraper className='p-4'>
        {/* <InputWithIcon
          value={keyWord}
          onChange={e => setKeyWord(e.target.value)}
          placeholder='Search Asessment'
          className='mb-4 mr-4 h-[50px] w-full rounded-[16px] border-0 bg-[#F9F9F9] text-primary'
          startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
        /> */}

        <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
          Browse Instruments
        </div>

        {isLoading ? (
          <CardLoader />
        ) : (
          <div className='mt-4 grid grid-cols-1 gap-2 md:grid-cols-2'>
            {assessments.map(item => (
              <Link
                key={item.assessment_id}
                href={`assessments/${item.assessment_id}`}
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
                    {item.title}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </ContentWraper>
    </>
  )
}
