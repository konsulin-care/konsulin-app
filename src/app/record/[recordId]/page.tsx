'use client';

import BackButton from '@/components/general/back-button';
import Header from '@/components/header';
import { useSearchParams } from 'next/navigation';
import RecordAssessment from './record-assessment';
import RecordExercise from './record-exercise';
import RecordJournal from './record-journal';
import RecordSoap from './record-soap';

export interface IDetailRecordParams {
  params: { recordId: string };
}

export default function RecordDetail({ params }: IDetailRecordParams) {
  const searchParams = useSearchParams();
  const category = Number(searchParams.get('category'));
  const titleParam = searchParams.get('title');

  const pageTitle = (category: number) => {
    switch (category) {
      case 1:
        return 'Assessment Result';
      case 2:
        return 'Exercise Result';
      case 3:
        return 'SOAP Result Details';
      case 4:
        return 'Journal Detail';
    }
  };

  const renderContent = (category: number) => {
    switch (category) {
      case 1:
        return (
          <RecordAssessment recordId={params.recordId} title={titleParam} />
        );
      case 2:
        return <RecordExercise />;
      case 3:
        return <RecordSoap soapId={params.recordId} title={titleParam} />;
      case 4:
        return <RecordJournal journalId={params.recordId} />;
    }
  };

  const route = (category: number) => {
    switch (category) {
      case 1:
        return 'assessments';
      case 2:
        return 'exercise';
      case 3:
      case 4:
        return 'record';
    }
  };

  return (
    <>
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <BackButton route={`/${route(category)}`} />

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
