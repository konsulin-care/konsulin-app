import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import Image from 'next/image'
import Link from 'next/link'

export default function MedalCollection({ medals }) {
  return (
    <>
      <div className='flex items-center justify-between py-4'>
        <p className='text-sm font-bold text-[#2C2F35] opacity-60'>
          Medal Collection
        </p>
        <Link href='/' className='text-xs text-[#2C2F35] opacity-60'>
          See All
        </Link>
      </div>
      <ScrollArea className='w-full whitespace-nowrap'>
        <div className='flex space-x-4'>
          {medals.map((medal: any, index: number) => (
            <Link
              key={index}
              href={'/'}
              className='card flex w-[250px] shrink-0 items-center gap-2 text-wrap bg-white'
            >
              <Image
                src={'/icons/survivor.svg'}
                alt='survivor-icon'
                width={48}
                height={48}
              />
              <div className='flex flex-col'>
                <span className='text-left text-[12px] font-bold'>
                  {medal.title}
                </span>
                <span className='text-left text-[10px] text-muted'>
                  {medal.description}
                </span>
              </div>
            </Link>
          ))}
        </div>
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </>
  )
}
