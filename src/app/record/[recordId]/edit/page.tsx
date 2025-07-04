'use client';

import EditSoap from '@/app/assessments/soap/edit-soap';
import Notfound from '@/app/not-found';
import BackButton from '@/components/general/back-button';
import Header from '@/components/header';
import EditJournal from '@/components/journal/edit';
import { useSearchParams } from 'next/navigation';

export interface IDetailRecordParams {
  params: { recordId: string };
}

export default function EditRecordDetail({ params }: IDetailRecordParams) {
  const searchParams = useSearchParams();
  const category = Number(searchParams.get('category'));
  const titleParam = searchParams.get('title');

  const pageTitle = (category: number) => {
    switch (category) {
      case 3:
        return 'SOAP Report';
      case 4:
        return 'Journaling';
    }
  };

  const isValidCategory = [1, 2, 3, 4].includes(category);

  if (!isValidCategory) {
    return <Notfound />;
  }

  const renderContent = (category: number) => {
    switch (category) {
      case 3:
        return <EditSoap soapId={params.recordId} title={titleParam} />;
      case 4:
        return <EditJournal journalId={params.recordId} />;
    }
  };

  return (
    <>
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <BackButton />

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
