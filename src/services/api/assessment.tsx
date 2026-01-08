import { IQuestionnaireResponse } from '@/types/assessment';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Bundle,
  BundleEntry,
  QuestionnaireResponse,
  QuestionnaireResponseItem
} from 'fhir/r4';
import { useMemo } from 'react';
import { getAPI } from '../api';

type IResultBriefPayload = {
  questionnaire: string;
  description: string;
  item: QuestionnaireResponseItem[];
};

export const RESULT_BRIEF_PLACEHOLDER =
  'The data is still being processed, kindly visit this page later.';

export const RESULT_BRIEF_LOGIN_REQUIRED =
  'Kindly log in to generate the result brief.';

const POLL_INTERVAL_MS = 1000; // 1 request per second
const MAX_WAIT_MS = 3000; // max 3 seconds total

type HookInterpretResponse = {
  success: boolean;
  message: string;
  data?: {
    asyncServiceResultId?: string;
  };
};

type ServiceRequestResultResponse = {
  success: boolean;
  message: string;
  data?: {
    note?: string;
    // other fields exist but we only care about note
  };
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

      const researchStudies = data.entry
        .filter((e: any) => e.resource?.resourceType === 'ResearchStudy')
        .map((e: any) => e.resource);

      const planDefinitions = data.entry
        .filter((e: any) => e.resource?.resourceType === 'PlanDefinition')
        .map((e: any) => e.resource);

      const planToQuestionnaires: Record<string, string[]> = {};

      planDefinitions.forEach((plan: any) => {
        if (!plan?.id) return;

        const questionnaireIds: string[] =
          plan.action?.flatMap((action: any) => {
            const refId = parseCanonicalOrReference(
              action.definitionReference?.reference,
              'Questionnaire'
            );

            const canId = parseCanonicalOrReference(
              action.definitionCanonical,
              'Questionnaire'
            );

            return [refId, canId].filter(Boolean) as string[];
          }) || [];

        const planId: string = plan.id;

        planToQuestionnaires[planId] = [...new Set(questionnaireIds)];
      });

      return researchStudies.map((study: any) => {
        const protocolRefs = Array.isArray(study.protocol)
          ? study.protocol
          : [study.protocol].filter(Boolean);

        const planIds = protocolRefs
          .map((protocol: any) => {
            const ref = protocol?.reference ?? protocol?.canonical ?? protocol;

            return parseCanonicalOrReference(ref, 'PlanDefinition');
          })
          .filter(Boolean) as string[];

        const questionnaireIds = planIds.flatMap(
          planId => planToQuestionnaires[planId] || []
        );

        return {
          resource: study,
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function pollServiceRequestNote(
  API: Awaited<ReturnType<typeof getAPI>>,
  serviceRequestId: string
): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const res = await API.get<ServiceRequestResultResponse>(
      `/api/v1/service-request/${serviceRequestId}/result`
    );

    const note = res.data?.data?.note?.trim() ?? '';
    if (note) return note;

    const elapsed = Date.now() - start;
    if (elapsed + POLL_INTERVAL_MS >= MAX_WAIT_MS) break;

    await sleep(POLL_INTERVAL_MS);
  }

  return '';
}

export const useResultBrief = (questionnaireId: string) => {
  type ResultBriefResponse = { note: string; serviceRequestId: string };

  return useMutation<ResultBriefResponse, Error, IResultBriefPayload>({
    mutationKey: ['result-brief', questionnaireId],
    mutationFn: async ({ questionnaire, description, item }) => {
      const payload = { questionnaire, item, description };

      const API = await getAPI();

      // 1) Trigger async webhook through backend
      const hookRes = await API.post<HookInterpretResponse>(
        `/api/v1/hook/interpret`,
        payload
      );

      const serviceRequestId =
        hookRes.data?.data?.asyncServiceResultId?.trim() ?? '';

      if (!serviceRequestId) {
        // Backend response not as expected - fail fast so UI can show error
        throw new Error('Missing asyncServiceResultId from hook response');
      }

      // 2) Poll result endpoint for up to 3 seconds
      const note = await pollServiceRequestNote(API, serviceRequestId);

      // 3) Return note if available, else placeholder
      return {
        note: note || RESULT_BRIEF_PLACEHOLDER,
        serviceRequestId
      };
    },
    onError: error => {
      console.error('[useResultBrief] error:', error);
    }
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

    if (context) {
      url += `&context=${context}`;
    }

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
      url += `&_text=${encodeURIComponent(query)}`;
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
    select: response => response.data.entry || [],
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
