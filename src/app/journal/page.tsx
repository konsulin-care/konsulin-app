'use client';

import BackButton from '@/components/general/back-button';
import Header from '@/components/header';
import CreateJournal from '@/components/journal/create';

export default function Journal() {
  return (
    <>
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <BackButton />

          <div className='text-[14px] font-bold text-white'>Journaling</div>
        </div>
      </Header>
      <CreateJournal />
    </>
  );
}
