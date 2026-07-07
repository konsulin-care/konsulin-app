'use client';

import EditSoap from '@/app/assessments/soap/edit-soap';
import Notfound from '@/app/not-found';
import EditJournal from '@/components/journal/edit';
import PageHeader from '@/components/page-header';
import { useSearchParams } from 'next/navigation';

/**
 *
 */
export default function EditRecordDetail() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') ?? '';
  const category = Number(searchParams.get('category'));
  const titleParam = searchParams.get('title');

  /** Returns page title based on record category. */
  const pageTitle = (category: number) => {
    switch (category) {
      case 3: {
        return 'SOAP Report';
      }
      case 4: {
        return 'Journaling';
      }
      default: {
        return '';
      }
    }
  };

  const isValidCategory = [1, 2, 3, 4].includes(category);

  if (!isValidCategory) {
    return <Notfound />;
  }

  /** Renders the edit form based on record category. */
  const renderContent = (category: number) => {
    switch (category) {
      case 3: {
        return <EditSoap soapId={id} title={titleParam} />;
      }
      case 4: {
        return <EditJournal journalId={id} />;
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
