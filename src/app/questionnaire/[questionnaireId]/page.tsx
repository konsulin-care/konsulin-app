'use client'

import EmptyState from '@/components/general/empty-state'
import FhirFormsRenderer from '@/components/general/fhir-forms-renderer'
import Header from '@/components/header'
import { LoadingSpinnerIcon } from '@/components/icons'
import NavigationBar from '@/components/navigation-bar'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import { useQuestionnaire } from '@/services/questionnaire'
import Image from 'next/image'
import React from 'react'

export interface IQuestionnaire extends IWithAuth {
  params: { questionnaireId: string }
}

const Questionnaire: React.FC<IQuestionnaire> = ({
  params,
  isAuthenticated,
  userRole
}) => {
  const { data: questionnaire, isLoading: questionnaireIsLoading } =
    useQuestionnaire(params.questionnaireId)

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
          {questionnaireIsLoading ? (
            <div className='flex min-h-screen min-w-full items-center justify-center'>
              <LoadingSpinnerIcon
                width={56}
                height={56}
                className='w-full animate-spin'
              />
            </div>
          ) : !questionnaire ? (
            <EmptyState title='Questionnaire not found' subtitle='' />
          ) : (
            <FhirFormsRenderer
              questionnaire={questionnaire}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>
      </div>
    </NavigationBar>
  )
}

export default withAuth(Questionnaire, ['patient'], true)
