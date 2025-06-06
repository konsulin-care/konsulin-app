import { getUtcDayRange } from '@/utils/helper';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bundle } from 'fhir/r4';
import { API } from '../api';

export const useGetUpcomingAppointments = ({ patientId, dateReference }) => {
  const { utcStart } = getUtcDayRange(new Date(dateReference));

  return useQuery({
    queryKey: ['appointments', dateReference],
    queryFn: () =>
      API.get(
        `/fhir/Appointment?actor=Patient/${patientId}&slot.start=ge${utcStart}&_include=Appointment:actor:PractitionerRole&_include:iterate=PractitionerRole:practitioner&_include=Appointment:slot`
      ),
    select: response => {
      return response.data || null;
    },
    enabled: !!patientId && !!dateReference
  });
};

export const useGetAllAppointments = ({ patientId }) => {
  return useQuery({
    queryKey: ['all-appointments'],
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

export const useGetUpcomingSessions = ({ practitionerId, dateReference }) => {
  const { utcStart } = getUtcDayRange(new Date(dateReference));

  return useQuery({
    queryKey: ['sessions', dateReference],
    queryFn: () =>
      API.get(
        `/fhir/Appointment?actor=Practitioner/${practitionerId}&slot.start=ge${utcStart}&_include=Appointment:actor:Patient&_include=Appointment:slot`
      ),
    select: response => {
      return response.data || null;
    },
    enabled: !!practitionerId && !!dateReference
  });
};

export const useGetAllSessions = ({ practitionerId }) => {
  return useQuery({
    queryKey: ['all-sessions'],
    queryFn: () =>
      API.get(
        `/fhir/Appointment?actor=Practitioner/${practitionerId}&_include=Appointment:actor:Patient&_include=Appointment:slot`
      ),
    select: response => {
      return response.data || null;
    },
    enabled: !!practitionerId
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

export const useGetPractitionerSlots = ({ practitionerId, dateReference }) => {
  const { utcStart } = getUtcDayRange(new Date(dateReference));

  return useQuery({
    queryKey: ['slots', dateReference],
    queryFn: () =>
      API.get(
        `/fhir/Slot?_has:Appointment:slot:practitioner=${practitionerId}&start=ge${utcStart}`
      ),
    select: response => {
      return response.data || null;
    },
    enabled: !!practitionerId && !!dateReference
  });
};
