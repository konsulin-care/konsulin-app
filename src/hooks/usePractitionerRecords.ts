import { useRecords } from './useRecords';
import type { UseRecordsResult } from './useRecordsShared';

/**
 * Fetch patient records for practitioner view via 3 resource queries.
 *
 * Same as usePatientRecords but includes all QuestionnaireResponses
 * (including practitioner-authored SOAP notes) and skips profile enrichment.
 *
 * @param patientId - Patient FHIR ID, or null to disable
 * @param startDate - ISO date string for `_lastUpdated=ge` filter
 * @param endDate - ISO date string for `_lastUpdated=le` filter
 */
export function usePractitionerRecords(
  patientId: string | null,
  startDate?: string,
  endDate?: string
): UseRecordsResult {
  return useRecords(
    patientId,
    {
      queryKeyPrefix: 'practitioner',
      skipPractitionerAuthored: false,
      enrichProfiles: false
    },
    startDate,
    endDate
  );
}
