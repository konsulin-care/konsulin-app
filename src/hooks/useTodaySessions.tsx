import { useAuth } from '@/context/auth/authContext';
import { useGetTodaySessions } from '@/services/api/appointments';
import { mergeNames, parseMergedSessions } from '@/utils/helper';
import { format } from 'date-fns';
import { useMemo } from 'react';

const now = new Date();

export function useTodaySessions() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const practitionerId = authState?.userInfo?.fhirId;
  const isAuthenticated = authState?.isAuthenticated;

  const {
    data: sessionData,
    isLoading,
    fetchStatus,
    isFetching
  } = useGetTodaySessions({
    practitionerId,
    dateReference: format(now, 'yyyy-MM-dd'),
    enabled: !isAuthLoading
  });

  const todaySessions = useMemo(() => {
    if (!sessionData || sessionData.total === 0 || !isAuthenticated) return [];

    const parsed = parseMergedSessions(sessionData);

    const patientMap = new Map<string, string>();

    parsed.forEach(session => {
      const { patientId, patientName, patientEmail } = session;
      if (!patientMap.has(patientId)) {
        const fullName = mergeNames(patientName);
        const displayName = fullName.trim() === '-' ? patientEmail : fullName;
        patientMap.set(patientId, displayName);
      }
    });

    const list = Array.from(patientMap, ([patientId, patientName]) => ({
      patientId,
      patientName
    }));

    return list;
  }, [sessionData, isAuthenticated]);

  const safeLoading = fetchStatus !== 'idle' && (isLoading || isFetching);

  return { data: todaySessions, isLoading: safeLoading };
}
