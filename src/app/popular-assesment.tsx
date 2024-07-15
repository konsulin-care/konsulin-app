import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { ChevronRightIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function PopularAssesment() {
  return (
    <div className='bg-[#F9F9F9] p-4'>
      <div className='flex justify-between text-muted'>
        <span className='mb-2 text-[14px] font-bold'>Popular Assesment</span>
        <Link className='text-[12px]' href={'/'}>
          See All
        </Link>
      </div>
      <div>
        <ScrollArea className='w-full whitespace-nowrap pb-4'>
          <div className='flex w-max space-x-4'>
            {Array(5)
              .fill(undefined)
              .map((_, index: number) => (
                <Link
                  key={index}
                  href={'/'}
                  className='card flex w-fit shrink-0 items-center gap-2 bg-white'
                >
                  <Image
                    width={40}
                    height={40}
                    alt='excerise'
                    src={'/images/exercise.svg'}
                  />
                  <div className='flex flex-col'>
                    <span className='text-[12px] font-bold'>
                      BIG 5 Personality Test
                    </span>
                    <span className='text-[10px] text-muted'>
                      Know yourself in 5 aspects of traits
                    </span>
                  </div>
                  <ChevronRightIcon className='text-muted' />
                </Link>
              ))}
          </div>
          <ScrollBar orientation='horizontal' />
        </ScrollArea>
      </div>
    </div>
  )
}
