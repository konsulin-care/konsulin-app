import { LoadingSpinnerIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { useSubmitQuestionnaire } from '@/services/questionnaire'

import { QueryClientProvider } from '@tanstack/react-query'
import { Questionnaire, QuestionnaireResponse } from 'fhir/r4'
import { useState } from 'react'
import { toast } from 'react-toastify'
import {
  BaseRenderer,
  getResponse,
  RendererThemeProvider,
  useBuildForm,
  useRendererQueryClient
} from 'smart-forms/packages/smart-forms-renderer/src'

interface FhirFormsRendererProps {
  questionnaire: Questionnaire
  isAuthenticated: Boolean
}

function FhirFormsRenderer(props: FhirFormsRendererProps) {
  const { questionnaire, isAuthenticated } = props
  const [response, setResponse] = useState<QuestionnaireResponse | null>(null)

  const queryClient = useRendererQueryClient()
  const isBuilding = useBuildForm(questionnaire)

  const {
    mutate: submitQuestionnaire,
    isLoading: submitQuestionnaireIsLoading
  } = useSubmitQuestionnaire(response, isAuthenticated)

  if (isBuilding) {
    return (
      <div className='flex min-h-screen min-w-full items-center justify-center'>
        <LoadingSpinnerIcon
          width={56}
          height={56}
          className='w-full animate-spin'
        />
      </div>
    )
  }

  return (
    <RendererThemeProvider>
      <QueryClientProvider client={queryClient}>
        <div className='custom-smart-form'>
          <BaseRenderer />
        </div>
      </QueryClientProvider>
      <div className='mt-4 px-5'>
        <Button
          disabled={submitQuestionnaireIsLoading}
          className='w-full bg-secondary text-white'
          onClick={() => {
            const questionnaireResponse = getResponse()
            setResponse(questionnaireResponse)
            submitQuestionnaire(undefined, {
              onSuccess: data => {
                toast.success('Success')
              }
            })
          }}
        >
          {submitQuestionnaireIsLoading ? (
            <LoadingSpinnerIcon stroke='white' />
          ) : (
            'Submit Response'
          )}
        </Button>
      </div>
    </RendererThemeProvider>
  )
}

export default FhirFormsRenderer
