import { useMutation, useQuery } from '@tanstack/react-query';
import { Bundle } from 'fhir/r4';
import { API } from '../api';

export const useGetAppointments = () => {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => API.get(`/api/v1/appointments`),
    select: response => {
      return response.data || null;
    }
  });
};
export const useGetUpcomingAppointments = () => {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => API.get(`/api/v1/appointments/upcoming`),
    select: response => {
      return response.data || null;
    }
  });
};

export const useCreateAppointment = () => {
  return useMutation({
    mutationKey: ['create-appointments'],
    mutationFn: async (payload: Bundle) => {
      try {
        const response = await API.post('/fhir', payload);
        return response.data.entry;
      } catch (error) {
        console.error('Error when booking an appointment:', error);
        throw error;
      }
    }
  });
};
