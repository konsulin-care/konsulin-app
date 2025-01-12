import { LoadingSpinnerIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { useSubmitQuestionnaire } from '@/services/questionnaire'

import {
  BaseRenderer,
  getResponse,
  RendererThemeProvider,
  useBuildForm,
  useQuestionnaireResponseStore,
  useRendererQueryClient
} from '@konsulin/smart-forms-renderer'
import { QueryClientProvider } from '@tanstack/react-query'
import { Questionnaire, QuestionnaireResponse } from 'fhir/r4'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

interface FhirFormsRendererProps {
  questionnaire: Questionnaire
  isAuthenticated: Boolean
  submitText?: string
  customObject?: Object
}

function FhirFormsRenderer(props: FhirFormsRendererProps) {
  const { questionnaire, isAuthenticated } = props
  const [response, setResponse] = useState<QuestionnaireResponse | null>(null)
  const [isValidated, setIsValidated] = useState<boolean | undefined>(undefined)

  const queryClient = useRendererQueryClient()
  const isBuilding = useBuildForm(questionnaire)

  const {
    mutate: submitQuestionnaire,
    isLoading: submitQuestionnaireIsLoading
  } = useSubmitQuestionnaire(response, isAuthenticated)

  const invalidItems = useQuestionnaireResponseStore.use.invalidItems()

  const handleValidation = () => {
    if (Object.keys(invalidItems).length !== 0) {
      setIsValidated(false)
    } else {
      const questionnaireResponse = getResponse()
      setResponse({ ...questionnaireResponse, ...props.customObject })
      submitQuestionnaire(undefined, {
        onSuccess: () => {
          toast.success('Assessments Berhasil Dikirim')
        }
      })
    }
  }

  useEffect(() => {
    if (Object.keys(invalidItems).length === 0) setIsValidated(true)
  }, [invalidItems])

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
      <div className='flex-flex-col mt-4 px-2'>
        {isValidated === false ? (
          <div className='mb-2 w-full text-destructive'>
            Lengkapi assessments sesuai instruksi
          </div>
        ) : (
          ''
        )}
        <Button
          disabled={submitQuestionnaireIsLoading || isValidated === false}
          className='w-full bg-secondary text-white'
          onClick={handleValidation}
        >
          {submitQuestionnaireIsLoading ? (
            <LoadingSpinnerIcon stroke='white' />
          ) : (
            props.submitText || 'Kirim'
          )}
        </Button>
      </div>
    </RendererThemeProvider>
  )
}

export default FhirFormsRenderer
