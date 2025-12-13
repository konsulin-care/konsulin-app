import { IQuestionnaireResponse } from '@/types/assessment';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import {
  Bundle,
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
        `/fhir/ResearchStudy?date=ge${today}&status=active&_include=ResearchStudy:protocol`
      );

      return response.data;
    },
    select: data => {
      if (!data?.entry) return [];

      // Separate resources by type
      const researchStudies = data.entry
        .filter((e: any) => e.resource?.resourceType === 'ResearchStudy')
        .map((e: any) => e.resource);

      const planDefinitions = data.entry
        .filter((e: any) => e.resource?.resourceType === 'PlanDefinition')
        .map((e: any) => e.resource);

      const planToQuestionnaires: Record<string, string[]> = {};

      planDefinitions.forEach((plan: any) => {
        const refs =
          plan.action
            ?.map((action: any) => action.definitionReference?.reference)
            ?.filter(Boolean)
            ?.map((ref: string) => ref.replace('Questionnaire/', '')) || [];

        planToQuestionnaires[plan.id] = refs;
      });

      return researchStudies.map((study: any) => {
        const protocolRefs = study.protocol || [];

        const questionnaireIds = protocolRefs.flatMap((protocol: any) => {
          const planId = protocol.reference?.replace('PlanDefinition/', '');
          return planToQuestionnaires[planId] || [];
        });

        return {
          researchStudy: study,
          questionnaireIds
        };
      });
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
