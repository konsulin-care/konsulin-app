import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import Image from 'next/image'
import Link from 'next/link'

export default function MedalCollection({ medals, isDisabled = false }) {
  return (
    <div
      className={`transition duration-300 ${isDisabled ? 'pointer-events-none opacity-50 blur-sm filter' : ''}`}
    >
      <div className='flex justify-between py-4 text-muted'>
        <span className='text-[14px] font-bold'> Medal Collection</span>
        <Link className='text-[12px]' href={'/'}>
          See All
        </Link>
      </div>
      <ScrollArea className='w-full whitespace-nowrap pb-4'>
        <div className='flex w-max space-x-4'>
          {medals.map((medal, index) => (
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
    </div>
  )
}
