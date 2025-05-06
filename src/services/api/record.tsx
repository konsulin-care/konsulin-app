import { IJournal } from '@/types/record';
import { useMutation, useQuery } from '@tanstack/react-query';
import { API } from '../api';

export const useRecordSummary = () => {
  return useMutation({
    mutationKey: ['record-summary'],
    mutationFn: async (patientId: string) => {
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
        const response = await API.post('/fhir', payload);
        return response.data.entry;
      } catch (error) {
        console.error('Error fetching record summary:', error);
        throw error;
      }
    }
  });
};

export const useGetJournal = (journalId: string) => {
  return useQuery({
    queryKey: ['get-journal', journalId],
    queryFn: () => API.get(`/fhir/Observation/${journalId}`),
    select: response => {
      return response.data || null;
    }
  });
};

export const useSubmitJournal = () => {
  return useMutation({
    mutationKey: ['journal'],
    mutationFn: async (journalData: IJournal) => {
      const timestamp = new Date().toISOString();
      const payload = { ...journalData, effectiveDateTime: timestamp };

      try {
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
