/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import Image from 'next/image';
import Link from 'next/link';

/**
 *
 */
export default function MedalCollection({ medals, isDisabled = false }) {
  return (
    <div
      className={`transition duration-300 ${isDisabled ? 'pointer-events-none opacity-50 blur-sm filter' : ''}`}
    >
      <div className='text-muted flex justify-between py-4'>
        <span className='text-[14px] font-bold'> Medal Collection</span>
        <Link className='text-[12px]' href={'/'}>
          See All
        </Link>
      </div>
      <ScrollArea className='w-full pb-4 whitespace-nowrap'>
        <div className='flex w-max space-x-4'>
          {medals.map(medal => (
            <Link
              key={medal.title}
              href={'/'}
              className='card flex w-[250px] shrink-0 items-center gap-2 bg-white text-wrap'
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
                <span className='text-muted text-left text-[10px]'>
                  {medal.description}
                </span>
              </div>
            </Link>
          ))}
        </div>
        <ScrollBar orientation='horizontal' />
      </ScrollArea>
    </div>
  );
}
