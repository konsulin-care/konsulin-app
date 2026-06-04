'use client';

import Notfound from '@/app/not-found';
import BackButton from '@/components/general/back-button';
import Header from '@/components/header';
import { formatTitle } from '@/utils/helper';
import { useSearchParams } from 'next/navigation';
import RecordAssessment from './record-assessment';
import RecordExercise from './record-exercise';
import RecordJournal from './record-journal';
import RecordSoap from './record-soap';

export default function RecordDetail() {
  const searchParams = useSearchParams();
  const recordId = searchParams.get('recordId') ?? '';
  const category = Number(searchParams.get('category'));
  const titleParam = searchParams.get('title');
  const formattedTitle = formatTitle(titleParam);

  const isValidCategory = [1, 2, 3, 4].includes(category);
  const isValidTitle =
    typeof titleParam === 'string' && titleParam.trim() !== '';

  if (!isValidTitle || !isValidCategory) {
    return <Notfound />;
  }

  const pageTitle = (category: number) => {
    switch (category) {
      case 1:
        return 'Assessment Result';
      case 2:
        return 'Exercise Result';
      case 3:
        return 'SOAP Detail';
      case 4:
        return 'Journal Detail';
    }
  };

  const renderContent = (category: number) => {
    switch (category) {
      case 1:
        return <RecordAssessment recordId={recordId} title={formattedTitle} />;
      case 2:
        return <RecordExercise />;
      case 3:
        return <RecordSoap soapId={recordId} title={titleParam} />;
      case 4:
        return <RecordJournal journalId={recordId} />;
    }
  };

  return (
    <>
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <BackButton route='/assessments' />

          <div className='text-[14px] font-bold text-white'>
            {pageTitle(category)}
          </div>
        </div>
      </Header>
      <div className='mt-[-24px] flex grow flex-col space-y-4 rounded-[16px] bg-white p-4'>
        {renderContent(category)}
      </div>
    </>
  );
}
