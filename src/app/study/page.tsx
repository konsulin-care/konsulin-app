'use client';

import ContentWraper from '@/components/general/content-wraper';
import PageHeader from '@/components/page-header';
import PageLayout from '@/components/page-layout';
import { Suspense } from 'react';
import StudyView from './study-view';

/** Study page route: one study with its take-part block. */
export default function StudyRoute() {
  return (
    <PageLayout variant='wide'>
      <PageHeader />
      <ContentWraper className='pt-4'>
        <div className='px-4'>
          <Suspense fallback={null}>
            <StudyView />
          </Suspense>
        </div>
      </ContentWraper>
    </PageLayout>
  );
}
