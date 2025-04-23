'use client';

import Header from '@/components/header';
import { ChevronLeftIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import RecordAssessment from './record-assessment';
import RecordExercise from './record-exercise';
import RecordJournal from './record-journal';
import RecordSoap from './record-soap';

export interface IDetailRecordParams {
  params: { recordId: string };
}

const RECORD_TYPE_ASSESSMENT = 1;
const RECORD_TYPE_EXCERCISE = 2;
const RECORD_TYPE_SOAP = 3;
const RECORD_TYPE_JOURNAL = 4;

export default function RecordDetail({ params }: IDetailRecordParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageType = Number(searchParams.get('type'));
  const questionnaireTitle = searchParams.get('title');

  const pageTitle = (type: number) => {
    switch (type) {
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

  const renderContent = (type: number) => {
    switch (type) {
      case 1:
        return (
          <RecordAssessment
            recordId={params.recordId}
            title={questionnaireTitle}
          />
        );
      case 2:
        return <RecordExercise />;
      case 3:
        return <RecordSoap />;
      case 4:
        return <RecordJournal />;
    }
  };

  return (
    <div>
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.push('/assessments')}
            color='white'
            className='mr-2 cursor-pointer'
          />

          <div className='text-[14px] font-bold text-white'>
            {pageTitle(pageType)}
          </div>
        </div>
      </Header>
      <div className='mt-[-24px] min-h-screen rounded-[16px] bg-white p-4'>
        {renderContent(pageType)}
      </div>
    </div>
  );
}
