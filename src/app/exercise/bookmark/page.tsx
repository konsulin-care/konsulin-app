'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { InputWithIcon } from '@/components/ui/input-with-icon'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import { BookmarkIcon, ChevronLeftIcon, SearchIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const ExerciseBookmar: React.FC<IWithAuth> = ({ isAuthenticated }) => {
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
            Favorit Excercise
          </div>
        </div>
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

        {/* Favorit Exercise  */}
        <div className='bg-[#F9F9F9] p-4'>
          <div className='text-[14px] font-bold text-muted'>
            See All Favorit Exercise
          </div>
          <div className='text-[10px] font-normal text-muted'>
            Browse All Exercises
          </div>
          <div className='p-4'>
            <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
              {Array(12)
                .fill(undefined)
                .map((_, index: number) => (
                  <div
                    key={index}
                    className='card flex flex-col items-center justify-center'
                  >
                    <Image
                      className='h-[100px] w-full rounded-lg'
                      width={158}
                      height={64}
                      alt='excerise'
                      src={'/images/exercise.svg'}
                    />
                    <span className='mb-[2px] mt-2 text-[10px] text-muted'>
                      6 Minutes
                    </span>
                    <div className='mt-2 text-[12px] font-bold text-primary'>
                      BIG 5 Personality Exercise Test
                    </div>
                    <div className='mt-2 max-w-full overflow-hidden truncate text-ellipsis text-[12px] text-muted'>
                      Know yourself in 5 aspects of Know yourself in 5 aspects
                    </div>

                    <div className='mt-2 flex h-[24px] w-full'>
                      <Link
                        href={`/clinic/${index + 1}`}
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
          </div>
        </div>
      </div>
    </NavigationBar>
  )
}

export default withAuth(ExerciseBookmar, ['patient'])
