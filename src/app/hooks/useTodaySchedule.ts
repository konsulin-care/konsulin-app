'use client';

import { useAuth } from '@/context/auth/authContext';
import { useGetTodaySessions } from '@/services/api/appointments';
import { mergeNames, parseMergedSessions } from '@/utils/helper';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';

export type SessionRowData = {
  slotStart?: string;
  slotEnd?: string;
  appointmentId?: string;
  displayPatientName: string;
};

/**
 * Fetches and enriches today's sessions for the authenticated clinician.
 *
 * Reads auth state to get the practitioner's FHIR ID, queries today's
 * appointments, parses merged sessions, enriches with display patient
 * names, and sorts by start time.
 *
 * @returns Sessions array, loading/error state, and a refetch function.
 */
export function useTodaySchedule() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const practitionerId = authState?.userInfo?.fhirId;

  const {
    data: sessionData,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    refetch: refetchSessions
  } = useGetTodaySessions({
    practitionerId,
    dateReference: format(new Date(), 'yyyy-MM-dd'),
    enabled: Boolean(practitionerId)
  });

  const sessions = useMemo(() => {
    if (!sessionData || sessionData.total === 0) return [];

    const parsed = parseMergedSessions(sessionData);

    const enriched = parsed
      .filter(session => session.slotStart && session.slotEnd)
      .map(session => {
        const patientName = mergeNames(session.patientName);
        return {
          ...session,
          displayPatientName:
            patientName.trim() === '-' ? session.patientEmail : patientName
        };
      });

    enriched.sort((a, b) => {
      return parseISO(a.slotStart).getTime() - parseISO(b.slotStart).getTime();
    });

    return enriched;
  }, [sessionData]);

  const isLoading = isAuthLoading || isSessionsLoading;

  return {
    sessions,
    isLoading,
    isError: isSessionsError,
    refetch: refetchSessions
  };
}
