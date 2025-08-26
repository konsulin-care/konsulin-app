import { IBundleResponse, IJournal } from '@/types/record';
import { getUtcDayRange } from '@/utils/helper';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bundle } from 'fhir/r4';
import { getAPI } from '../api';

type IFilterRecord = {
  patientId: string;
  startDate: string;
  endDate: string;
};

export const useRecordSummary = () => {
  return useMutation<IBundleResponse[], Error, { patientId: string }>({
    mutationKey: ['record-summary-patient'],
    mutationFn: async ({ patientId }) => {
      const payload = {
        type: 'batch',
        resourceType: 'Bundle',
        id: 'search-record-for-patient',
        entry: [
          {
            request: {
              method: 'GET',
              url: `/QuestionnaireResponse?patient=${patientId}&author=Patient/${patientId}&_sorted=-_lastUpdated`
            }
          },
          {
            request: {
              method: 'GET',
              url: `/Observation?patient=${patientId}&code=http://loinc.org|51855-5&_sorted=-_lastUpdated`
            }
          },
          {
            request: {
              method: 'GET',
              url: `/Observation?patient=${patientId}&code=http://loinc.org|67855-7&_sorted=-_lastUpdated`
            }
          }
        ]
      };

      try {
        const API = await getAPI();
        const response = await API.post('/fhir', payload);
        return response.data.entry;
      } catch (error) {
        console.error('Error fetching record summary:', error);
        throw error;
      }
    }
  });
};

export const useFilterRecordByDate = () => {
  return useMutation<IBundleResponse[], Error, IFilterRecord>({
    mutationKey: ['filtered-record-summary-patient'],
    mutationFn: async ({ patientId, startDate, endDate }) => {
      const { utcStart, utcEnd } = getUtcDayRange(
        new Date(startDate),
        new Date(endDate)
      );

      const payload = {
        type: 'batch',
        resourceType: 'Bundle',
        id: 'filter-record-for-patient',
        entry: [
          {
            request: {
              method: 'GET',
              url: `/QuestionnaireResponse?patient=${patientId}&author=Patient/${patientId}&authored=le${utcEnd}&authored=ge${utcStart}&_sorted=-_lastUpdated`
            }
          },
          {
            request: {
              method: 'GET',
              url: `/Observation?patient=${patientId}&code=http://loinc.org|51855-5&date=le${utcEnd}&date=ge${utcStart}&_sorted=-_lastUpdated`
            }
          },
          {
            request: {
              method: 'GET',
              url: `/Observation?patient=${patientId}&code=http://loinc.org|67855-7&date=le${utcEnd}&date=ge${utcStart}&_sorted=-_lastUpdated`
            }
          }
        ]
      };

      try {
        const API = await getAPI();
        const response = await API.post('/fhir', payload);
        return response.data.entry;
      } catch (error) {
        console.error('Error fetching record summary:', error);
        throw error;
      }
    }
  });
};

export const useRecordSummaryPractitioner = () => {
  return useMutation<Bundle, Error, { patientId: string }>({
    mutationKey: ['record-summary-practitioner'],
    mutationFn: async ({ patientId }) => {
      const payload = {
        type: 'batch',
        resourceType: 'Bundle',
        id: 'search-record-for-practitioner',
        entry: [
          {
            request: {
              method: 'GET',
              url: `/QuestionnaireResponse?patient=${patientId}&_sorted=-_lastUpdated`
            }
          },
          {
            request: {
              method: 'GET',
              url: `/Observation?patient=${patientId}&code=http://loinc.org|51855-5&_sorted=-_lastUpdated`
            }
          },
          {
            request: {
              method: 'GET',
              url: `/QuestionnaireResponse?patient=${patientId}&questionnaire=Questionnaire/soap&_sorted=-_lastUpdated`
            }
          }
        ]
      };

      try {
        const API = await getAPI();
        const response = await API.post('/fhir', payload);
        return response.data;
      } catch (error) {
        console.error('Error fetching record summary:', error);
        throw error;
      }
    }
  });
};

export const useFilterRecordPractitionerByDate = () => {
  return useMutation<Bundle, Error, IFilterRecord>({
    mutationKey: ['filtered-record-summary-practitioner'],
    mutationFn: async ({ patientId, startDate, endDate }) => {
      const { utcStart, utcEnd } = getUtcDayRange(
        new Date(startDate),
        new Date(endDate)
      );

      const payload = {
        type: 'batch',
        resourceType: 'Bundle',
        id: 'filter-record-for-practitioner',
        entry: [
          {
            request: {
              method: 'GET',
              url: `/QuestionnaireResponse?patient=${patientId}&authored=le${utcEnd}&authored=ge${utcStart}&_sorted=-_lastUpdated`
            }
          },
          {
            request: {
              method: 'GET',
              url: `/Observation?patient=${patientId}&code=http://loinc.org|51855-5&date=le${utcEnd}&date=ge${utcStart}&_sorted=-_lastUpdated`
            }
          },
          {
            request: {
              method: 'GET',
              url: `/QuestionnaireResponse?patient=${patientId}&questionnaire=Questionnaire/soap&authored=le${utcEnd}&date=ge${utcStart}&_sorted=-_lastUpdated`
            }
          }
        ]
      };

      try {
        const getAPI = await getAPI();
        const response = await API.post('/fhir', payload);
        return response.data;
      } catch (error) {
        console.error('Error fetching record summary:', error);
        throw error;
      }
    }
  });
};

export const useGetSingleRecord = ({
  id,
  resourceType
}: {
  id: string;
  resourceType: 'Observation' | 'QuestionnaireResponse';
}) => {
  return useQuery({
    queryKey: ['single-record', id],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(`/fhir/${resourceType}/${id}`);
      return response;
    },
    select: response => {
      return response.data || null;
    },
    enabled: !!id && !!resourceType
  });
};

export const useSubmitJournal = () => {
  return useMutation({
    mutationKey: ['journal'],
    mutationFn: async (journalData: IJournal) => {
      const payload = { ...journalData };

      try {
        const API = await getAPI();
        const response = await API.post('/fhir/Observation', payload);
        return response.data;
      } catch (error) {
        console.error('Error fetching record summary:', error);
        throw error;
      }
    }
  });
};

export const useUpdateJournal = () => {
  return useMutation({
    mutationKey: ['journal-update'],
    mutationFn: async (journalData: IJournal) => {
      try {
        const API = await getAPI();
        const response = await API.put(
          `/fhir/Observation/${journalData.id}`,
          journalData
        );
        return response.data;
      } catch (error) {
        console.error('Error fetching record summary:', error);
        throw error;
      }
    }
  });
};
