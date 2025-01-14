import { useMutation, useQuery } from '@tanstack/react-query'
import { API } from '../api'

export const useQuestionnaire = (questionnaireId: number | string) => {
  return useQuery({
    queryKey: ['assessments', questionnaireId],
    queryFn: () => API.get(`/api/v1/assessments/${questionnaireId}`),
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
    mutationKey: ['assessment-responses'],
    mutationFn: async () => {
      const response = await API.post('/api/v1/assessment-responses', {
        respondent_type: isAuthenticated ? 'user' : 'guest',
        questionnaire_response: questionnaireRresponse
      })
      return response.data
    }
  })
}

export const useListAssessments = () => {
  return useQuery({
    queryKey: ['list-assessments'],
    queryFn: () => API.get('/api/v1/assessments'),
    select: response => {
      return response.data || null
    }
  })
}
