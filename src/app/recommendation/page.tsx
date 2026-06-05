'use client';

import BackButton from '@/components/general/back-button';
import ContentWraper from '@/components/general/content-wraper';
import Header from '@/components/header';

export default function Recommendation() {
  return (
    <>
      <Header showChat={false} showNotification={false}>
        <div className='flex w-full items-center'>
          <BackButton route='/' />
          <div className='text-[14px] font-bold text-white'>Recommendation</div>
        </div>
      </Header>
      <ContentWraper>
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <p className='text-muted text-sm'>Coming soon</p>
        </div>
      </ContentWraper>
    </>
  );
}
