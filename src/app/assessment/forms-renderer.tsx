import { LoadingSpinnerIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'

import { QueryClientProvider } from '@tanstack/react-query'
import { Questionnaire, QuestionnaireResponse } from 'fhir/r4'
import { useState } from 'react'
import {
  BaseRenderer,
  getResponse,
  RendererThemeProvider,
  useBuildForm,
  useRendererQueryClient
} from 'smart-forms/packages/smart-forms-renderer/src'

interface YourBaseRendererWrapperProps {
  questionnaire: Questionnaire
}

function YourBaseRendererWrapper(props: YourBaseRendererWrapperProps) {
  const { questionnaire } = props
  const [response, setResponse] = useState<QuestionnaireResponse | null>(null)

  const queryClient = useRendererQueryClient()
  const isBuilding = useBuildForm(questionnaire)

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
        <BaseRenderer />
      </QueryClientProvider>
      <div className='mt-4 px-5'>
        <Button
          className='w-full bg-secondary text-white'
          onClick={() => {
            const questionnaireResponse = getResponse()
            setResponse(questionnaireResponse)
            console.log({ questionnaireResponse })
          }}
        >
          Submit Response
        </Button>
      </div>
    </RendererThemeProvider>
  )
}

export default YourBaseRendererWrapper
