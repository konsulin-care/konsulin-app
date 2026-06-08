'use client';

import { getNow } from '@/constants/date';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import {
  useGetUpcomingAppointments,
  useGetUpcomingSessions
} from '@/services/api/appointments';
import { format } from 'date-fns';

export function useUpcomingEvents() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const isPatient = authState?.userInfo?.role_name === Roles.Patient;
  const isPractitioner = authState?.userInfo?.role_name === Roles.Practitioner;
  const fhirId = authState?.userInfo?.fhirId;
  const dateRef = format(getNow(), 'yyyy-MM-dd');

  const { data: appointmentData } = useGetUpcomingAppointments({
    patientId: isPatient ? fhirId : undefined,
    dateReference: dateRef
  });

  const { data: sessionData } = useGetUpcomingSessions({
    practitionerId: isPractitioner ? fhirId : undefined,
    dateReference: dateRef
  });

  return {
    appointmentData,
    sessionData,
    isAuthLoading
  };
}
