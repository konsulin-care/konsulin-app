'use client'

import Header from '@/components/header'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import { ChevronLeftIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import RecordAssesment from './record-assesment'
import RecordExercise from './record-exercise'
import RecordJournal from './record-journal'
import RecordSoap from './record-soap'

export interface IDetailClinic extends IWithAuth {
  params: { recordId: string }
}

const RECORD_TYPE_ASSESMENT = 1
const RECORD_TYPE_EXCERCISE = 2
const RECORD_TYPE_SOAP = 3
const RECORD_TYPE_JOURNAL = 4

const RecordDetail: React.FC<IDetailClinic> = ({ isAuthenticated, params }) => {
  const router = useRouter()
  const pageType = RECORD_TYPE_JOURNAL

  const pageTitle = type => {
    switch (type) {
      case 1:
        return 'Assessment Result'
      case 2:
        return 'Exercise Result'
      case 3:
        return 'SOAP Result Details'
      case 4:
        return 'Journal Detail'
    }
  }

  const renderContent = type => {
    switch (type) {
      case 1:
        return <RecordAssesment recordId={params.recordId} />
      case 2:
        return <RecordExercise />
      case 3:
        return <RecordSoap />
      case 4:
        return <RecordJournal />
    }
  }

  return (
    <div>
      <Header showChat={false}>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
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
  )
}

export default withAuth(RecordDetail, ['patient'])
