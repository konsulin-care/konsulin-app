'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageHeader from '@/components/page-header';

/**
 *
 */
export default function Recommendation() {
  return (
    <>
      <PageHeader />
      <ContentWraper>
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <p className='text-muted text-sm'>Coming soon</p>
        </div>
      </ContentWraper>
    </>
  );
}
