import { IQuestionnaireResponse } from '@/types/assessment';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import {
  Bundle,
  BundleEntry,
  QuestionnaireResponse,
  QuestionnaireResponseItem
} from 'fhir/r4';
import { useMemo } from 'react';
import { getAPI } from '../api';

// NOTE: will remove this later
const WEBHOOK_URL = 'https://flow.konsulin.care/webhook/interpret';
const WEBHOOK_AUTH =
  'wK3e06gzGCucksRmt4gE2Lmprg4NTH9oYWDM7dwnQmFNLycfaauYNaEqnwaL2zfF';

type IResultBriefPayload = {
  questionnaire: string;
  description: string;
  item: QuestionnaireResponseItem[];
};

export const useOngoingResearch = () => {
  return useQuery({
    queryKey: ['research'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const API = await getAPI();
      const response = await API.get(
        `/fhir/ResearchStudy?date=ge${today}&status=active&_revinclude=List:item`
      );
      return response;
    },
    select: response => {
      return response.data.entry || null;
    }
  });
};

export const useQuestionnaire = (questionnaireId: number | string) => {
  return useQuery({
    queryKey: ['assessments', questionnaireId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/Questionnaire?_id=${questionnaireId}`
      );
      return response;
    },
    select: response => {
      return response.data.entry || null;
    }
  });
};

export const useQuestionnaireSoap = () => {
  return useQuery({
    queryKey: ['SOAP'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get('/fhir/Questionnaire/soap');
      return response;
    },
    select: response => {
      return response.data || null;
    }
  });
};

export const useSubmitSoapBundle = () => {
  return useMutation({
    mutationKey: ['soap-response'],
    mutationFn: async (bundle: Bundle) => {
      const API = await getAPI();
      const response = await API.post('/fhir', bundle);
      return response.data;
    }
  });
};

export const useSubmitQuestionnaire = (
  questionnaireId: string,
  isAuthenticated: Boolean
) => {
  return useMutation({
    mutationKey: ['assessment-responses', questionnaireId],
    mutationFn: async (questionnaireResponse: QuestionnaireResponse) => {
      const { author, item, resourceType, subject } = questionnaireResponse;

      const timestamp = new Date().toISOString();

      if (isAuthenticated) {
        localStorage.removeItem(`response_${questionnaireId}`);
      }

      const API = await getAPI();
      const response = await API.post('/fhir/QuestionnaireResponse', {
        author,
        item,
        resourceType,
        questionnaire: `Questionnaire/${questionnaireId}`,
        status: 'completed',
        authored: timestamp,
        subject
      });
      return response.data;
    }
  });
};

export const useUpdateSubmitQuestionnaire = (
  questionnaireId: string,
  isAuthenticated: boolean
) => {
  return useMutation({
    mutationKey: ['assessment-responses', questionnaireId],
    mutationFn: async (questionnaireResponse: QuestionnaireResponse) => {
      const { author, item, resourceType, subject, id } = questionnaireResponse;

      const timestamp = new Date().toISOString();

      if (isAuthenticated) {
        localStorage.removeItem(`response_${questionnaireId}`);
      }

      const API = await getAPI();
      const response = await API.put(`/fhir/QuestionnaireResponse/${id}`, {
        id,
        author,
        item,
        resourceType,
        questionnaire: `Questionnaire/${questionnaireId}`,
        status: 'completed',
        authored: timestamp,
        subject
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
    },
    onError: error => error.message
  });
};

export const useQuestionnaireResponse = ({
  questionnaireId,
  patientId,
  enabled
}: IQuestionnaireResponse) => {
  const url = useMemo(() => {
    const baseUrl = '/fhir/QuestionnaireResponse';

    if (!patientId && questionnaireId) {
      return `${baseUrl}/${questionnaireId}`;
    }

    return `${baseUrl}?questionnaire=Questionnaire/big-five-inventory&patient=${patientId}&_elements=item&_sort=-_lastUpdated`;
  }, [patientId, questionnaireId]);

  return useQuery({
    queryKey: ['questionnaire-response', questionnaireId, patientId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(url);
      return response;
    },
    select: response => response.data || null,
    enabled: enabled
  });
};

/**
 * Standalone search function for questionnaires that can be used with generic search hooks
 * @param query Search query text
 * @param context Optional context filter (popular/regular/research)
 * @returns Promise that resolves to an array of BundleEntry
 */
export const searchQuestionnaires = async (
  query: string,
  context?: string
): Promise<BundleEntry[]> => {
  try {
    const API = await getAPI();
    let url = `/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient`;

    if (query) {
      // Try multiple search strategies for better FHIR compatibility
      const searchStrategies = [
        `&_text=${encodeURIComponent(query)}`, // Primary: _text search
        `&title:contains=${encodeURIComponent(query)}`, // Fallback: title contains
        `&description:contains=${encodeURIComponent(query)}` // Fallback: description contains
      ];

      // Try each strategy until one succeeds
      for (const strategy of searchStrategies) {
        try {
          const testUrl = url + strategy;
          const response = await API.get(testUrl);

          // If we get results, return them
          if (response.data.entry && response.data.entry.length > 0) {
            return response.data.entry || [];
          }
        } catch (strategyError) {
          console.warn(
            'Search strategy failed, trying next:',
            strategy,
            strategyError.message
          );
          // Continue to next strategy
        }
      }

      // If no strategy worked, return empty array
      return [];
    }

    if (context) {
      url += `&context=${context}`;
    }

    const response = await API.get(url);
    return response.data.entry || [];
  } catch (error) {
    console.error('Error searching questionnaires:', error);
    // Return empty array instead of throwing to maintain consistent behavior
    return [];
  }
};

/**
 * Enhanced search hook for questionnaires with context filtering support
 * @param query Search query text
 * @param context Optional context filter (popular/regular/research)
 * @returns useQuery result with questionnaire search results
 */
export const useSearchQuestionnaire = (query: string, context?: string) => {
  const url = useMemo(() => {
    let url = `/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient`;

    if (query) {
      url += `&_text=${query}`;
    }

    if (context) {
      url += `&context=${context}`;
    }

    return url;
  }, [query, context]);

  return useQuery({
    queryKey: ['search-questionnaire', query, context],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(url);
      return response;
    },
    select: response => response.data.entry || null,
    enabled: !!query && query.length >= 3 // Only enable if query is meaningful
  });
};

export const useRegularAssessments = () => {
  return useQuery({
    queryKey: ['regular-assessments'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        '/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient&status=active&context=regular'
      );
      return response;
    },
    select: response => response.data.entry || null
  });
};

export const usePopularAssessments = () => {
  return useQuery({
    queryKey: ['popular-assessments'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        '/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient&context=popular'
      );
      return response;
    },
    select: response => response.data.entry || null
  });
};
