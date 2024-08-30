import { useQuery } from '@tanstack/react-query'
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
