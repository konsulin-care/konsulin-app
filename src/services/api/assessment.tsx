import { IQuestionnaireResponse } from '@/types/assessment';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Bundle,
  QuestionnaireResponse,
  QuestionnaireResponseItem
} from 'fhir/r4';
import { useEffect, useMemo, useRef } from 'react';
import { getAPI } from '../api';

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

const RESULT_BRIEF_PLACEHOLDER =
  'The data is still being processed, kindly visit this page later.';

type ResultBriefItem = {
  linkId: string;
  answer: Array<{
    valueString: string;
  }>;
};

type TriggerResultBriefResponse = {
  asyncServiceResultId?: string;
  resultItem: ResultBriefItem;
};

export const useResultBrief = (questionnaireId: string) => {
  return useMutation<TriggerResultBriefResponse, Error, IResultBriefPayload>({
    mutationKey: ['result-brief', questionnaireId],
    mutationFn: async ({ questionnaire, description, item }) => {
      const API = await getAPI();

      try {
        const triggerRes = await API.post('/api/v1/hook/interpret', {
          questionnaire,
          description,
          item
        });

        const asyncServiceResultId =
          triggerRes?.data?.data?.asyncServiceResultId;

        return {
          asyncServiceResultId,
          resultItem: {
            linkId: 'result-brief',
            answer: [
              {
                valueString: RESULT_BRIEF_PLACEHOLDER
              }
            ]
          }
        };
      } catch (error) {
        console.error(
          'Error triggering result brief:',
          error instanceof Error ? error.message : error
        );

        return {
          asyncServiceResultId: undefined,
          resultItem: {
            linkId: 'result-brief',
            answer: [
              {
                valueString: RESULT_BRIEF_PLACEHOLDER
              }
            ]
          }
        };
      }
    }
  });
};

type PollResultParams = {
  asyncServiceResultId?: string;
  enabled: boolean;
  onResult: (note: string) => void;
};

const POLL_INTERVAL_MS = 1000;
const MAX_DURATION_MS = 3000;

export const usePollResultBrief = ({
  asyncServiceResultId,
  enabled,
  onResult
}: PollResultParams) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !asyncServiceResultId) return;

    const API = getAPI();
    const startTime = Date.now();

    intervalRef.current = setInterval(async () => {
      try {
        const res = await (
          await API
        ).get(`/api/v1/service-request/${asyncServiceResultId}/result`);

        const note = res?.data?.data?.note;

        if (note) {
          onResult(note);
          clearInterval(intervalRef.current!);
          clearTimeout(timeoutRef.current!);
        }
      } catch (error) {
        console.error(
          'Polling result brief failed:',
          error instanceof Error ? error.message : error
        );
      }
    }, POLL_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!);
    }, MAX_DURATION_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [asyncServiceResultId, enabled, onResult]);
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

export const useSearchQuestionnaire = (query: string) => {
  return useQuery({
    queryKey: ['search-result-assessment', query],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/Questionnaire?_elements=title,description&subject-type=Person,Patient&_text=${query}`
      );
      return response;
    },
    select: response => response.data.entry || null
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
