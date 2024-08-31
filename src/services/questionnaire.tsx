import { useMutation, useQuery } from '@tanstack/react-query'
import { API } from './api'

export const useQuestionnaire = (questionnaireId: number | string) => {
  return useQuery({
    queryKey: ['questionnaire', questionnaireId],
    queryFn: () => API.get(`/api/v1/questionnaires/${questionnaireId}`),
    select: response => {
      return response.data || null
    }
  })
}

export const useSubmitQuestionnaire = (
  questionnaireRresponse,
  isAuthenticated
) => {
  return useMutation({
    mutationKey: ['questionnaire-responses'],
    mutationFn: async () => {
      const response = await API.post('/api/v1/questionnaire-responses', {
        respondent_type: isAuthenticated ? 'user' : 'guest',
        questionnaire_response: questionnaireRresponse
      })
      return response.data
    }
  })
}
