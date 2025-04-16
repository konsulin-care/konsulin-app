import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { QuestionnaireResponse } from 'fhir/r4';
import { API } from '../api';

export const useOngoingResearch = () => {
  return useQuery({
    queryKey: ['research'],
    queryFn: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return API.get(
        `https://dev-blaze.konsulin.care/fhir/ResearchStudy?date=ge${today}&_revinclude=List:item`
      );
    },
    select: response => {
      return response.data.entry || null;
    }
  });
};

export const useQuestionnaire = (questionnaireId: number | string) => {
  return useQuery({
    queryKey: ['assessments', questionnaireId],
    queryFn: () => API.get(`/fhir/Questionnaire?_id=${questionnaireId}`),
    select: response => {
      return response.data.entry || null;
    }
  });
};

export const useSubmitQuestionnaire = (
  questionnaireResponse: QuestionnaireResponse,
  isAuthenticated: Boolean
) => {
  return useMutation({
    mutationKey: ['assessment-responses'],
    mutationFn: async () => {
      const { author, item, resourceType, questionnaire, status, subject } =
        questionnaireResponse;

      const timestamp = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");

      const response = await API.post('/fhir/QuestionnaireResponse', {
        author: author,
        item: item,
        resourceType: resourceType,
        questionnaire: questionnaire,
        status: status,
        authored: timestamp,
        subject: subject
        // respondent_type: isAuthenticated ? 'user' : 'guest',
        // questionnaire_response: questionnaireRresponse
      });
      return response.data;
    }
  });
};

export const useSearchQuestionnaire = (query: string) => {
  return useQuery({
    queryKey: ['search-result-assessment', query],
    queryFn: () =>
      API.get(
        `https://dev-blaze.konsulin.care/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient&_text=${query}`
      ),
    select: response => response.data.entry || null
  });
};

export const useRegularAssessments = () => {
  return useQuery({
    queryKey: ['regular-assessments'],
    queryFn: () =>
      API.get(
        '/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient&status=active&context=regular'
      ),
    select: response => response.data.entry || null
  });
};

export const usePopularAssessments = () => {
  return useQuery({
    queryKey: ['popular-assessments'],
    queryFn: () =>
      API.get(
        '/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient&context=popular'
      ),
    select: response => response.data.entry || null
  });
};
