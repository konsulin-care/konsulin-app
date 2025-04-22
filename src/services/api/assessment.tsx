import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { QuestionnaireResponse, QuestionnaireResponseItem } from 'fhir/r4';
import { API } from '../api';

const WEBHOOK_AUTH =
  'wK3e06gzGCucksRmt4gE2Lmprg4NTH9oYWDM7dwnQmFNLycfaauYNaEqnwaL2zfF';
const WEBHOOK_URL = 'https://flow.konsulin.care/webhook/interpret';

type IResultBriefPayload = {
  questionnaire: string;
  description: string;
  item: QuestionnaireResponseItem[];
};

export const useOngoingResearch = () => {
  return useQuery({
    queryKey: ['research'],
    queryFn: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return API.get(
        `/fhir/ResearchStudy?date=ge${today}&status=active&_revinclude=List:item`
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
  questionnaireId: string
  // isAuthenticated: Boolean
) => {
  return useMutation({
    mutationKey: ['assessment-responses', questionnaireId],
    mutationFn: async (questionnaireResponse: QuestionnaireResponse) => {
      const { author, item, resourceType, status, subject } =
        questionnaireResponse;

      const timestamp = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'");

      const response = await API.post('/fhir/QuestionnaireResponse', {
        author,
        item,
        resourceType,
        questionnaire: `Questionnaire/${questionnaireId}`,
        status,
        authored: timestamp,
        subject
        // respondent_type: isAuthenticated ? 'user' : 'guest',
        // questionnaire_response: questionnaireRresponse
      });
      return response.data;
    }
  });
};

export const useResultBrief = (questionnaireId: string) => {
  return useMutation<Array<any>, Error, IResultBriefPayload>({
    mutationKey: ['result-brief', questionnaireId],
    mutationFn: async ({ questionnaire, description, item }) => {
      const payload = {
        questionnaire,
        item,
        description
      };

      const response = await axios.post(`${WEBHOOK_URL}`, payload, {
        headers: {
          Authorization: `${WEBHOOK_AUTH}`
        }
      });
      return response.data;
    }
  });
};

export const useQuestionnaireResponse = (questionnaireId: string) => {
  return useQuery({
    queryKey: ['questionnaire-response', questionnaireId],
    queryFn: () => API.get(`/fhir/QuestionnaireResponse/${questionnaireId}`),
    select: response => response.data || null
  });
};

export const useSearchQuestionnaire = (query: string) => {
  return useQuery({
    queryKey: ['search-result-assessment', query],
    queryFn: () =>
      API.get(
        `/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient&_text=${query}`
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
