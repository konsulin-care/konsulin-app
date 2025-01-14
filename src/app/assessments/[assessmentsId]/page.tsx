'use client'

import ContentWraper from '@/components/general/content-wraper'
import EmptyState from '@/components/general/empty-state'
import FhirFormsRenderer from '@/components/general/fhir-forms-renderer'
import Header from '@/components/header'
import { LoadingSpinnerIcon } from '@/components/icons'
import NavigationBar from '@/components/navigation-bar'
import { useAuth } from '@/context/auth/authContext'
import { useQuestionnaire } from '@/services/api/assessment'
import Image from 'next/image'

export interface IQuestionnaire {
  params: { assessmentsId: string }
}

export default function Questionnaire({ params }) {
  const { state: authState } = useAuth()
  const { data: questionnaire, isLoading: questionnaireIsLoading } =
    useQuestionnaire(params.assessmentsId)

  /** The code below is only for debugging purposes. Please remove it later. */
  // const questionnaireIsLoading = false
  // const questionnaire = require('../questionnaire/short-question.json')

  return (
    <>
      <NavigationBar />
      <Header>
        {!authState.isAuthenticated ? (
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
                Aji Si {authState.userInfo.role_name}
              </div>
            </div>
          </div>
        )}
      </Header>
      <ContentWraper>
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
              isAuthenticated={authState.isAuthenticated}
              customObject={{
                subject: {
                  reference: `https://blaze.konsulin.care/fhir/Patient/${authState.userInfo.id}`,
                  type: 'Patient'
                },
                author: {
                  reference: `https://blaze.konsulin.care/fhir/Patient/${authState.userInfo.id}`, // chage this to the clincianID for SOAP
                  type: 'Practitioner'
                }
              }}
            />
          )}
        </div>
      </ContentWraper>
    </>
  )
}
