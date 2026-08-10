'use client';

import AppDrawer from '@/components/ui/app-drawer';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly viewRoute?: string;
};

/**
 * Success drawer shown after a journal entry is saved, with a single
 * "Back" CTA that routes to the record view.
 */
export default function JournalSuccessDrawer({
  isOpen,
  onClose,
  viewRoute
}: Props) {
  const router = useRouter();

  return (
    <AppDrawer
      open={isOpen}
      onClose={onClose}
      title={
        <>
          <div className='flex justify-center p-2'>
            <Image
              className='rounded-[8px] object-cover'
              src={'/images/journal-img.png'}
              height={0}
              width={120}
              alt='success'
            />
          </div>
          <div className='mb-2 text-center text-2xl font-bold'>
            Stay Motivated Today!
          </div>
        </>
      }
      description='Writing a journal is an important step to understand yourself and maintain your mental health.'
      ctaLabel='Back'
      onCtaClick={() => router.push(viewRoute ?? '/record')}
    />
  );
}
