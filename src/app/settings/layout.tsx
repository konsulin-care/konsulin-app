'use client';

import Header from '@/components/header';
import NavigationBar from '@/components/navigation-bar';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LayoutSettings({ children }) {
  const router = useRouter();

  return (
    <>
      <NavigationBar />
      <Header showChat={false}>
        <div className='flex w-full items-center justify-start space-x-2 pb-2'>
          <ChevronLeft
            onClick={() => router.back()}
            color='white'
            width={30}
            height={30}
          />
          <div className='text-[14px] font-bold text-white'>Settings</div>
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        <div className='min-h-screen p-4'>{children}</div>
      </div>
    </>
  );
}
