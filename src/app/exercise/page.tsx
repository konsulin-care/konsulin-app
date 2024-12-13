'use client'

import ContentWraper from '@/components/general/content-wraper'
import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import { getExceriseList } from '@/services/api/exercise'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeftIcon, SearchIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Exercise() {
  const router = useRouter()
  const [keyWord, setKeyWord] = useState('')

  const { data: excerciseData, isLoading: excerciseIsLoading } = useQuery({
    queryKey: ['getExceriseList'],
    queryFn: getExceriseList
  })

  const filteredExcerciseData = !keyWord
    ? excerciseData
    : excerciseData.filter(
        item =>
          item.title.toLowerCase().includes(keyWord.toLowerCase()) ||
          item.description.toLowerCase().includes(keyWord.toLowerCase())
      )

  return (
    <>
      <NavigationBar />
      <Header
        showChat={false}
        // moreAction={
        //   <Link href='/exercise/bookmark'>
        //     <Image
        //       width={32}
        //       height={32}
        //       alt='offline'
        //       src={'/icons/bookmark.svg'}
        //     />
        //   </Link>
        // }
      >
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />

          <div className='text-[14px] font-bold text-white'>Self Excercise</div>
        </div>
      </Header>
      {/* <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white'> */}
      <ContentWraper>
        {/* Filter / Search */}
        <div className='p-4'>
          <InputWithIcon
            value={keyWord}
            onChange={e => setKeyWord(e.target.value)}
            placeholder='Search'
            className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
            startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
          />
        </div>

        {/* Recommended Exercises  */}
        {/* <div className='bg-[#F9F9F9] p-4'>
          <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
            Recommended Exercises
          </div>
          <div className='text-[10px] font-normal text-[hsla(220,9%,19%,0.6)]'>
            Based on your turbulence data
          </div>
          <ScrollArea className='mt-2 w-full whitespace-nowrap pb-4'>
            <div className='flex w-max space-x-4'>
              {excerciseIsLoading || !excerciseData
                ? null
                : excerciseData.map(excercise => (
                    <Link
                      key={excercise.youtube_id}
                      href={`/exercise/${excercise.youtube_id}`}
                      className='card flex flex-col gap-2 bg-white'
                    >
                      <div className='flex justify-between'>
                        <Image
                          className='mr-4'
                          width={40}
                          height={40}
                          alt='excerise'
                          src={`https://i.ytimg.com/vi/${excercise.youtube_id}/hq720.jpg`}
                        />

                        <div className='flex'>
                          <div className='mr-2 flex h-[24px] rounded-[12px] bg-[#08979C] px-[10px] py-[4px]'>
                            <Image
                              src={'/icons/award.svg'}
                              height={16}
                              width={16}
                              alt='award'
                            />
                            <span className='ml-2 text-[10px] font-normal text-white'>
                              Best Impact
                            </span>
                          </div>
                          <div className='h-[24px] rounded-[8px] bg-[#13C2C2] p-1'>
                            <BookmarkIcon
                              color='white'
                              height={16}
                              width={16}
                              fill='white'
                            />
                          </div>
                        </div>
                      </div>
                      <div className='mt-2 flex flex-col'>
                        <span className='text-[10px] text-muted'>
                          {excercise.duration} Minutes
                        </span>
                        <span className='text-[12px] font-bold'>
                          {excercise.title}
                        </span>
                        <span className='mt-2 max-w-[250px] overflow-hidden truncate text-ellipsis text-[10px] text-muted'>
                          {excercise.description}
                        </span>
                      </div>
                    </Link>
                  ))}
            </div>
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div> */}

        {/* Other */}
        {/* <div className='p-4'>
          <div className='text-[14px] font-bold text-[hsla(220,9%,19%,0.6)]'>
            All Video
          </div>
          <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
            {excerciseIsLoading || !excerciseData.length
              ? null
              : filteredExcerciseData.map(excercise => (
                  <div
                    key={excercise.youtube_id}
                    className='card flex flex-col items-center justify-center'
                  >
                    <Image
                      className='h-[100px] w-full rounded-lg bg-cover'
                      width={158}
                      height={64}
                      alt='excerise'
                      src={`https://i.ytimg.com/vi/${excercise.youtube_id}/hq720.jpg`}
                    />
                    <span className='mb-[2px] mt-2 text-[10px] text-muted'>
                      {excercise.duration} Minutes
                    </span>
                    <div className='mt-2 text-[12px] font-bold text-primary'>
                      {excercise.title}
                    </div>
                    <div className='mt-2 max-w-full overflow-hidden truncate text-ellipsis text-[12px] text-muted'>
                      {excercise.description}
                    </div>

                    <div className='mt-2 flex h-[24px] w-full'>
                      <Link
                        href={`/exercise/${excercise.youtube_id}`}
                        className='mr-2 flex grow items-center justify-center rounded-md bg-secondary py-2 text-[10px] font-normal text-white'
                      >
                        Open
                      </Link>
                      <div className='flex w-[24px] cursor-pointer items-center justify-center rounded-md bg-[#13C2C2]'>
                        <BookmarkIcon
                          color='white'
                          height={16}
                          width={16}
                          fill='white'
                        />
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div> */}

        <div className='grow p-4'>
          <div className='flex flex-col gap-y-4'>
            {excerciseIsLoading || !excerciseData
              ? null
              : filteredExcerciseData.map(excercise => (
                  <Link
                    key={excercise.id}
                    href={`/exercise/${excercise.id}`}
                    className='card flex gap-4 bg-white'
                  >
                    <Image
                      src={'/images/exercise.svg'}
                      height={40}
                      width={40}
                      alt='exercise'
                    />
                    <div className='mt-2 flex flex-col'>
                      <span className='text-[10px] text-muted'>
                        {excercise.duration} Minutes
                      </span>
                      <span className='text-[12px] font-bold'>
                        {excercise.title}
                      </span>
                      <span className='mt-2 max-w-[250px] overflow-hidden truncate text-ellipsis text-[10px] text-muted'>
                        {excercise.description}
                      </span>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </ContentWraper>
    </>
  )
}
