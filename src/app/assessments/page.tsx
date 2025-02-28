'use client'

import BackButton from '@/components/general/back-button'
import CardLoader from '@/components/general/card-loader'
import ContentWraper from '@/components/general/content-wraper'
import Header from '@/components/header'
import { FilterIcon } from '@/components/icons'
import NavigationBar from '@/components/navigation-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useListAssessments } from '@/services/api/assessment'
import { AwardIcon, BookmarkIcon, SearchIcon } from 'lucide-react'
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

      <ContentWraper className='pt-4'>
        <div className='flex gap-4 px-4'>
          <InputWithIcon
            placeholder='Search Asessment'
            className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
            startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
          />
          <Button
            variant='outline'
            className={cn(
              'flex h-[50px] w-[50px] items-center justify-center rounded-lg border-0 bg-[#F9F9F9]'
            )}
          >
            <FilterIcon
              width={20}
              height={20}
              className='min-h-[20px] min-w-[20px]'
              fill='#13c2c2'
            />
          </Button>
        </div>

        <div className='mb-2 mt-4 px-4 text-muted'>
          <div className='text-[14px] font-bold'>On-going Research</div>
          <div className='text-[10px]'>
            Your heart is valuable. Please participate in our ongoing study to
            help us help you more. We will send you the result if you need to
            know.
          </div>
          <ScrollArea className='mt-2 w-full whitespace-nowrap'>
            <div className='flex w-max space-x-4 pb-4'>
              {Array(5)
                .fill(undefined)
                .map((_, index: number) => (
                  <Link
                    key={index}
                    href={`#`}
                    className='card flex max-w-[280px] flex-col gap-2 bg-white'
                  >
                    <div className='flex gap-2'>
                      <Image
                        className='h-[64px] w-[64px] rounded-[8px] object-cover'
                        src={'/images/clinic.jpg'}
                        height={64}
                        width={64}
                        alt='clinic'
                      />
                      <div className='flex flex-col text-[12px]'>
                        <div className='text-wrap font-bold text-black'>
                          Riset Hubungan Romantis
                        </div>
                        <div className='text-wrap'>
                          Peran hubungan romantis antar kepribadian dengan
                          indeks kebahagiaan
                        </div>
                      </div>
                    </div>
                    <hr />
                    <div className='flex items-center justify-between'>
                      <div className='mr-4'>
                        <div className='text-[10px]'>Pengambilan data:</div>
                        <div className='text-[10px] font-bold text-black'>
                          1 - 30 Desember 2025
                        </div>
                      </div>
                      <Button
                        size='sm'
                        className='rounded-[32px] bg-secondary font-bold text-white'
                      >
                        Gabung
                      </Button>
                    </div>
                  </Link>
                ))}
            </div>
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div>

        <div className='bg-[#F9F9F9] p-4'>
          <div className='mb-2 text-[14px] font-bold text-muted'>
            Popular Assessment
          </div>

          <ScrollArea className='w-full whitespace-nowrap'>
            <div className='flex w-max space-x-4 pb-4'>
              {Array(5)
                .fill(undefined)
                .map((_, index: number) => (
                  <Link
                    key={index}
                    href={`#`}
                    className='card flex flex-col gap-4 bg-white'
                  >
                    <div className='flex items-start justify-between'>
                      <Image
                        src={'/images/exercise.svg'}
                        height={40}
                        width={40}
                        alt='exercise'
                      />
                      <div className='flex min-w-[192px] justify-end gap-2'>
                        <Badge className='flex items-center rounded-[8px] bg-secondary px-[10px] py-[4px]'>
                          <AwardIcon size={16} color='white' fill='white' />
                          <div className='text-[10px] text-white'>
                            Best Impact
                          </div>
                        </Badge>
                        <Badge className='rounded-[8px] bg-secondary px-[10px] py-[4px]'>
                          <BookmarkIcon size={16} color='white' fill='white' />
                        </Badge>
                      </div>
                    </div>
                    <div className='mt-2 flex flex-col'>
                      <span className='text-[10px] text-muted'>6 Minutes</span>
                      <span className='text-[12px] font-bold'>
                        BIG 5 Personality Test
                      </span>
                      <span className='mt-2 max-w-[250px] overflow-hidden truncate text-ellipsis text-[10px] text-muted'>
                        Know yourself in 5 aspects of traits
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div>

        <div className='p-4'>
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
        </div>
      </ContentWraper>
    </>
  )
}
