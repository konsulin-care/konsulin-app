import { getUtcDayRange } from '@/utils/helper';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bundle, Slot } from 'fhir/r4';
import { getAPI } from '../api';

/** Fetch upcoming appointments for a patient relative to a date. */
export const useGetUpcomingAppointments = ({
  patientId,
  dateReference
}: {
  patientId: string;
  dateReference: string;
}) => {
  const { utcStart } = getUtcDayRange(new Date(dateReference));

  return useQuery({
    queryKey: ['appointments', patientId, dateReference],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/Appointment?actor=Patient/${patientId}&slot.start=ge${utcStart}&_include=Appointment:actor:PractitionerRole&_include:iterate=PractitionerRole:practitioner&_include=Appointment:slot`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    enabled: Boolean(patientId) && Boolean(dateReference)
  });
};

/** Fetch all appointments for a patient. */
export const useGetAllAppointments = ({ patientId }: { patientId: string }) => {
  return useQuery({
    queryKey: ['all-appointments', patientId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/Appointment?actor=Patient/${patientId}&_include=Appointment:actor:PractitionerRole&_include:iterate=PractitionerRole:practitioner&_include=Appointment:slot`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    enabled: Boolean(patientId)
  });
};

/** Fetch upcoming sessions for a practitioner from a given date. */
export const useGetUpcomingSessions = ({
  practitionerId,
  dateReference
}: {
  practitionerId: string;
  dateReference: string;
}) => {
  const { utcStart } = getUtcDayRange(new Date(dateReference));

  return useQuery({
    queryKey: ['sessions', practitionerId, dateReference],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/Appointment?actor=Practitioner/${practitionerId}&slot.start=ge${utcStart}&_include=Appointment:actor:Patient&_include=Appointment:slot`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    enabled: Boolean(practitionerId) && Boolean(dateReference)
  });
};

/** Fetch all sessions for a practitioner. */
export const useGetAllSessions = ({
  practitionerId
}: {
  practitionerId: string;
}) => {
  return useQuery({
    queryKey: ['all-sessions', practitionerId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/Appointment?actor=Practitioner/${practitionerId}&_include=Appointment:actor:Patient&_include=Appointment:slot`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    enabled: Boolean(practitionerId)
  });
};

/** Fetch today's sessions for a practitioner. */
export const useGetTodaySessions = ({
  practitionerId,
  dateReference,
  enabled = true
}: {
  practitionerId: string;
  dateReference: string;
  enabled?: boolean;
}) => {
  const { utcStart, utcEnd } = getUtcDayRange(new Date(dateReference));

  return useQuery({
    queryKey: ['today-sessions', practitionerId, dateReference],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle>(
        `/fhir/Appointment?_elements=appointmentType,participant,slot&practitioner=${practitionerId}&slot.start=ge${utcStart}&slot.start=le${utcEnd}&_include=Appointment:patient`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    enabled: Boolean(dateReference) && Boolean(practitionerId) && enabled
  });
};

/** Create a new appointment via FHIR bundle. */
export const useCreateAppointment = () => {
  return useMutation({
    mutationKey: ['create-appointments'],
    mutationFn: async (payload: Bundle) => {
      try {
        const API = await getAPI();
        const response = await API.post<Bundle>('/fhir', payload);
        const entries = response.data.entry;
        return entries ?? [];
      } catch (error) {
        console.error('Error when booking an appointment:', error);
        throw error;
      }
    }
  });
};

/** Pay for an appointment via online payment or offline booking. */
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
        return response.data; // eslint-disable-line @typescript-eslint/no-unsafe-return
      } catch (error) {
        console.error('Error when paying/booking an appointment:', error);
        throw error;
      }
    }
  });
};

/** Fetch available slots for a practitioner on a given date. */
export const useGetPractitionerSlots = ({
  practitionerId,
  dateReference
}: {
  practitionerId: string;
  dateReference: string;
}) => {
  const { utcStart } = getUtcDayRange(new Date(dateReference));

  return useQuery({
    queryKey: ['slots', practitionerId, dateReference],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get<Bundle<Slot>>(
        `/fhir/Slot?_has:Appointment:slot:practitioner=${practitionerId}&start=ge${utcStart}`
      );
      return response;
    },
    select: response => {
      return response.data || null;
    },
    enabled: Boolean(practitionerId) && Boolean(dateReference)
  });
};
