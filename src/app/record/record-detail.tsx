'use client';

import Notfound from '@/app/not-found';
import PageHeader from '@/components/page-header';
import { formatTitle } from '@/utils/helper';
import { useSearchParams } from 'next/navigation';
import RecordAssessment from './record-assessment';
import RecordExercise from './record-exercise';
import RecordJournal from './record-journal';
import RecordSoap from './record-soap';

/**
 *
 */
export default function RecordDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const category = Number(searchParams.get('category'));
  const titleParam = searchParams.get('title');
  const formattedTitle = formatTitle(titleParam);

  const isValidCategory = [1, 2, 3, 4].includes(category);
  const isValidTitle =
    typeof titleParam === 'string' && titleParam.trim() !== '';

  if (!isValidTitle || !isValidCategory) {
    return <Notfound />;
  }

  /** Returns page title based on record category. */
  const pageTitle = (category: number) => {
    switch (category) {
      case 1: {
        return 'Assessment Result';
      }
      case 2: {
        return 'Exercise Result';
      }
      case 3: {
        return 'SOAP Detail';
      }
      case 4: {
        return 'Journal Detail';
      }
      default: {
        return '';
      }
    }
  };

  /** Renders the appropriate record component based on category. */
  const renderContent = (category: number) => {
    switch (category) {
      case 1: {
        return <RecordAssessment recordId={id} title={formattedTitle} />;
      }
      case 2: {
        return <RecordExercise />;
      }
      case 3: {
        return <RecordSoap soapId={id} title={titleParam} />;
      }
      case 4: {
        return <RecordJournal journalId={id} />;
      }
      default: {
        return null;
      }
    }
  };

  return (
    <>
      <PageHeader pageIndicator={pageTitle(category)} />
      <div className='mt-[-24px] flex grow flex-col space-y-4 rounded-[16px] bg-white p-4'>
        {renderContent(category)}
      </div>
    </>
  );
}
