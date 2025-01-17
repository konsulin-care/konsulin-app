'use client'

import BackButton from '@/components/general/back-button'
import ContentWraper from '@/components/general/content-wraper'
import EmptyState from '@/components/general/empty-state'
import FhirFormsRenderer from '@/components/general/fhir-forms-renderer'
import Header from '@/components/header'
import { LoadingSpinnerIcon } from '@/components/icons'
import NavigationBar from '@/components/navigation-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/auth/authContext'
import { useQuestionnaire } from '@/services/api/assessment'

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
        <div className='flex w-full items-center'>
          <BackButton />
          <div className='text-[14px] font-bold text-white'>
            {questionnaireIsLoading ? (
              <Skeleton className='h-[24px] w-[175px]' />
            ) : (
              questionnaire.title
            )}
          </div>
        </div>
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
            <EmptyState
              className='py-16'
              title='Questionnaire not found'
              subtitle=''
            />
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
