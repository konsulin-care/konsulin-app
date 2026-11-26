import type { StudyProgress } from '@/utils/fhir/research';
import { readStudyProfile } from '@/utils/fhir/study-profile';

/**
 * Compare two optional batch end dates; a missing end sorts last.
 * @param a - first end date (yyyy-mm-dd) or undefined
 * @param b - second end date or undefined
 * @returns negative, zero or positive
 */
function compareEnd(a?: string, b?: string): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : 1;
}

/**
 * Sort the catalogue: Konsulin first, then current batch end ascending
 * (no open batch last), then title.
 * @param studies - study progress entries
 * @param konsulinOrgId - configured Konsulin organization id (may be empty)
 * @returns new sorted array
 */
export function sortCatalogue(
  studies: StudyProgress[],
  konsulinOrgId: string
): StudyProgress[] {
  return studies.toSorted((a, b) => {
    const ka = readStudyProfile(a.study, konsulinOrgId).isKonsulin;
    const kb = readStudyProfile(b.study, konsulinOrgId).isKonsulin;
    if (ka !== kb) return ka ? -1 : 1;
    const byEnd = compareEnd(a.currentBatch?.end, b.currentBatch?.end);
    if (byEnd !== 0) return byEnd;
    return (a.study.title ?? '').localeCompare(b.study.title ?? '');
  });
}
