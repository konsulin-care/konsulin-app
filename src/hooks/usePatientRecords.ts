import { useAuth } from '@/context/auth/authContext';
import { useRecords } from './useRecords';
import type { UseRecordsResult } from './useRecordsShared';

export type { UseRecordsResult } from './useRecordsShared';

/**
 * Fetch patient-authored records with profile enrichment.
 *
 * - Skips practitioner-authored QuestionnaireResponses
 * - Enriches records with practitioner/patient profile photos; the patient's
 *   own profile comes from the auth bootstrap (fullProfile) when available
 *
 * @param patientId - Patient FHIR ID, or null to disable
 * @param startDate - ISO date string for `_lastUpdated=ge` filter
 * @param endDate - ISO date string for `_lastUpdated=le` filter
 */
export function usePatientRecords(
  patientId: string | null,
  startDate?: string,
  endDate?: string
): UseRecordsResult {
  const { state: authState } = useAuth();
  return useRecords(
    patientId,
    {
      queryKeyPrefix: 'patient',
      skipPractitionerAuthored: true,
      enrichProfiles: true
    },
    startDate,
    endDate,
    authState?.userInfo?.fullProfile
  );
}
