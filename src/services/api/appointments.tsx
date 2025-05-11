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
export const useGetUpcomingAppointments = ({ patientId, dateReference }) => {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () =>
      API.get(
        `/fhir/Appointment?actor=Patient/${patientId}&slot.start=ge${dateReference}&_include=Appointment:actor:PractitionerRole&_include:iterate=PractitionerRole:practitioner&_include=Appointment:slot`
      ),
    select: response => {
      return response.data || null;
    },
    enabled: !!patientId && !!dateReference
  });
};

export const useGetAllAppointments = ({ patientId }) => {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () =>
      API.get(
        `/fhir/Appointment?actor=Patient/${patientId}&_include=Appointment:actor:PractitionerRole&_include:iterate=PractitionerRole:practitioner&_include=Appointment:slot`
      ),
    select: response => {
      return response.data || null;
    },
    enabled: !!patientId
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
