import { getUtcDayRange } from '@/utils/helper';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bundle } from 'fhir/r4';
import { getAPI } from '../api';

export const useGetUpcomingAppointments = ({ patientId, dateReference }) => {
  const { utcStart } = getUtcDayRange(new Date(dateReference));

  return useQuery({
    queryKey: ['appointments', dateReference],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/Appointment?actor=Patient/${patientId}&slot.start=ge${utcStart}&_include=Appointment:actor:PractitionerRole&_include:iterate=PractitionerRole:practitioner&_include=Appointment:slot`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    enabled: !!patientId && !!dateReference
  });
};

export const useGetAllAppointments = ({ patientId }) => {
  return useQuery({
    queryKey: ['all-appointments'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/Appointment?actor=Patient/${patientId}&_include=Appointment:actor:PractitionerRole&_include:iterate=PractitionerRole:practitioner&_include=Appointment:slot`
      );
      return response;
    },
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
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/Appointment?actor=Practitioner/${practitionerId}&slot.start=ge${utcStart}&_include=Appointment:actor:Patient&_include=Appointment:slot`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    enabled: !!practitionerId && !!dateReference
  });
};

export const useGetAllSessions = ({ practitionerId }) => {
  return useQuery({
    queryKey: ['all-sessions'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/Appointment?actor=Practitioner/${practitionerId}&_include=Appointment:actor:Patient&_include=Appointment:slot`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    enabled: !!practitionerId
  });
};

export const useGetTodaySessions = ({
  practitionerId,
  dateReference,
  enabled = true
}) => {
  const { utcStart, utcEnd } = getUtcDayRange(dateReference);

  return useQuery({
    queryKey: ['today-sessions'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/Appointment?_elements=appointmentType,participant,slot&practitioner=${practitionerId}&slot.start=ge${utcStart}&slot.start=le${utcEnd}&_include=Appointment:patient`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    enabled: !!dateReference && !!practitionerId && enabled
  });
};

export const useCreateAppointment = () => {
  return useMutation({
    mutationKey: ['create-appointments'],
    mutationFn: async (payload: Bundle) => {
      try {
        const API = await getAPI();
        const response = await API.post('/fhir', payload);
        return response.data.entry;
      } catch (error) {
        console.error('Error when booking an appointment:', error);
        throw error;
      }
    }
  });
};

// New unified payment/appointment endpoint
export const usePayAppointment = () => {
  return useMutation({
    mutationKey: ['pay-appointment'],
    mutationFn: async (payload: {
      patientId: string; // e.g., "Patient/123"
      invoiceId: string; // e.g., "Invoice/456"
      useOnlinePayment: boolean;
      practitionerRoleId: string; // e.g., "PractitionerRole/789"
      slotId: string; // e.g., "Slot/abc"
      condition: string;
    }) => {
      try {
        const API = await getAPI();
        const response = await API.post('/api/v1/pay/appointment', payload);
        return response.data;
      } catch (error) {
        console.error('Error when paying/booking an appointment:', error);
        throw error;
      }
    }
  });
};

export const useGetPractitionerSlots = ({ practitionerId, dateReference }) => {
  const { utcStart } = getUtcDayRange(new Date(dateReference));

  return useQuery({
    queryKey: ['slots', dateReference],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/Slot?_has:Appointment:slot:practitioner=${practitionerId}&start=ge${utcStart}`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    enabled: !!practitionerId && !!dateReference
  });
};
