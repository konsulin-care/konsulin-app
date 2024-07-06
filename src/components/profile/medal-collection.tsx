import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import Image from 'next/image'
import Link from 'next/link'

export default function MedalCollection({ medals }) {
  function handleSeeAll() {}

  return (
    <>
      <div className='flex justify-between py-4'>
        <p className='text-sm font-bold text-[#2C2F35] opacity-60'>
          Medal Collection
        </p>
        <p onClick={handleSeeAll} className='text-sm text-[#2C2F35] opacity-60'>
          See All
        </p>
      </div>
      <ScrollArea className='w-full whitespace-nowrap rounded-md'>
        <div className='flex'>
          {medals.map((medal: any, index: number) => (
            <Link
              key={index}
              href={'/'}
              className='card mr-4 flex w-[250px] items-center text-wrap bg-white text-justify'
            >
              <Image
                src={'/icons/survivor.svg'}
                alt='survivor-icon'
                width={48}
                height={48}
              />
              <div className='flex flex-col items-start justify-start pl-2'>
                <p className='py-1 text-xs font-bold text-secondary'>
                  {medal.title}
                </p>
                <p className='text-black-100 text-start text-[10px]'>
                  {medal.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </>
  )
}
