'use client';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
};

/**
 *
 */
export default function JournalSuccessDrawer({ isOpen, onClose }: Props) {
  const router = useRouter();

  return (
    <Drawer onClose={onClose} open={isOpen}>
      <DrawerContent className='mx-auto max-w-screen-sm p-4'>
        <DrawerHeader className='mx-auto flex flex-col items-center gap-4 pb-0 text-[20px]'>
          <Image
            className='rounded-[8px] object-cover p-6'
            src={'/images/journal-img.png'}
            height={0}
            width={200}
            style={{ width: 'auto', height: 'auto' }}
            alt='success'
          />
          <DrawerTitle className='mb-2 text-center text-2xl font-bold'>
            Tetap Semangat Untuk Hari Ini!
          </DrawerTitle>
        </DrawerHeader>

        <DrawerDescription className='px-4 text-center text-sm opacity-50'>
          Menulis jurnal adalah langkah penting untuk memahami diri sendiri dan
          menjaga kesehatan mental Anda.
        </DrawerDescription>

        <DrawerFooter className='mt-2 flex flex-col gap-4 text-gray-600'>
          <Button
            className='bg-secondary h-full w-full rounded-xl p-4 text-white'
            onClick={() => router.push('/record')}
          >
            Back
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
