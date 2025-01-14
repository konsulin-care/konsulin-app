import { LoadingSpinnerIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { useSubmitQuestionnaire } from '@/services/api/assessment'

import {
  BaseRenderer,
  getResponse,
  RendererThemeProvider,
  useBuildForm,
  useQuestionnaireResponseStore,
  useRendererQueryClient
} from '@aehrc/smart-forms-renderer'
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
  const [requiredItemEmpty, setRequiredItemEmpty] = useState<number>(0)

  const queryClient = useRendererQueryClient()
  const isBuilding = useBuildForm(questionnaire)

  const {
    mutate: submitQuestionnaire,
    isLoading: submitQuestionnaireIsLoading
  } = useSubmitQuestionnaire(response, isAuthenticated)

  const invalidItems = useQuestionnaireResponseStore.use.invalidItems()

  const checkRequiredIsEmpty = () => {
    const required = Object.values(invalidItems).flatMap(item =>
      item.issue
        .filter(issue => issue.code === 'required')
        .map(issue => ({
          expression: issue.expression[0],
          message: issue.details.text
        }))
    )
    setRequiredItemEmpty(required.length)
  }

  const handleValidation = () => {
    if (Object.keys(invalidItems).length !== 0) {
      checkRequiredIsEmpty()
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
    if (Object.keys(invalidItems).length === 0) setRequiredItemEmpty(0)
    if (requiredItemEmpty > 0) checkRequiredIsEmpty()
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
        {requiredItemEmpty > 0 ? (
          <div className='mb-2 w-full text-sm text-destructive'>
            Terdapat {requiredItemEmpty} pertanyaan wajib yang belum terisi, yuk
            dilengkapi dulu!
          </div>
        ) : (
          ''
        )}
        <Button
          disabled={submitQuestionnaireIsLoading || requiredItemEmpty > 0}
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
