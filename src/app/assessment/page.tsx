'use client'

import FhirFormsRenderer from '@/components/general/fhir-forms-renderer'
import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import Image from 'next/image'

const Assesment: React.FC<IWithAuth> = ({ userRole, isAuthenticated }) => {
  const questionnaire = require('./questionnaire/page-of-everything.json')

  return (
    <NavigationBar>
      <Header>
        {!isAuthenticated ? (
          <div className='mt-5'></div>
        ) : (
          <div className='flex'>
            <Image
              className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
              width={32}
              height={32}
              alt='offline'
              src={'/images/avatar.jpg'}
            />
            <div className='flex flex-col'>
              <div className='text-[10px] font-normal text-white'>
                Selamat Datang di Dashboard anda
              </div>
              <div className='text-[14px] font-bold text-white'>
                Aji Si {userRole}
              </div>
            </div>
          </div>
        )}
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        <div className='min-h-screen p-4'>
          <FhirFormsRenderer
            questionnaire={questionnaire}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </NavigationBar>
  )
}

export default withAuth(Assesment, ['patient', 'clinician'], true)
