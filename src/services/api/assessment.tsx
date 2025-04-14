import { useMutation, useQuery } from '@tanstack/react-query';
import { API } from '../api';

export const useQuestionnaire = (questionnaireId: number | string) => {
  return useQuery({
    queryKey: ['assessments', questionnaireId],
    queryFn: () => API.get(`/fhir/Questionnaire?_id=${questionnaireId}`),
    select: response => {
      return response.data || null;
    }
  });
};

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
      });
      return response.data;
    }
  });
};

export const useRegularAssessments = () => {
  return useQuery({
    queryKey: ['regular-assessments'],
    queryFn: () =>
      API.get(
        '/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient&status=active&context=regular'
      ),
    select: response => response.data.entry
  });
};

export const usePopularAssessments = () => {
  return useQuery({
    queryKey: ['popular-assessments'],
    queryFn: () =>
      API.get(
        '/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient&context=popular'
      ),
    select: response => response.data.entry
  });
};
