import { toFhirPath } from '@/hooks/useRecordsShared';
import type { StudyProgress } from '@/utils/fhir/research';
import { parseStudySearchset } from '@/utils/fhir/research-bundle';
import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';

/**
 * Reads a searchset and follows Bundle.link next until absent.
 *
 * @param API - Axios instance.
 * @param firstUrl - First page path.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns Merged study progress of every page.
 */
async function fetchAllPages(
  API: AxiosInstance,
  firstUrl: string,
  today: string
): Promise<StudyProgress[]> {
  const studies: StudyProgress[] = [];
  let url: string | undefined = firstUrl;
  while (url) {
    const { data }: { data: Bundle } = await API.get<Bundle>(url);
    studies.push(...parseStudySearchset(data, today));
    const next = data.link?.find(link => link.relation === 'next');
    url = next?.url ? toFhirPath(next.url) : undefined;
  }
  return studies;
}

/**
 * Fetches the active study catalogue, following next links.
 *
 * @param API - Axios instance.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns Study progress for every active study.
 */
export function fetchStudyCatalogue(
  API: AxiosInstance,
  today: string
): Promise<StudyProgress[]> {
  return fetchAllPages(
    API,
    `/fhir/ResearchStudy?status=active&date=ge${today}&_include=ResearchStudy:protocol&_count=50`,
    today
  );
}

/**
 * Fetches ids of studies the patient is currently on-study in.
 *
 * @param API - Axios instance.
 * @param patientId - Patient id.
 * @returns Study ids with ResearchSubject status on-study.
 */
export async function fetchConsentedStudyIds(
  API: AxiosInstance,
  patientId: string
): Promise<string[]> {
  const ids: string[] = [];
  let url: string | undefined =
    `/fhir/ResearchSubject?patient=Patient/${patientId}&_elements=study,status&_count=100`;
  while (url) {
    const { data }: { data: Bundle } = await API.get<Bundle>(url);
    for (const entry of data.entry ?? []) {
      const subject = entry.resource;
      if (subject?.resourceType !== 'ResearchSubject') continue;
      if (subject.status !== 'on-study') continue;
      const id = subject.study?.reference?.split('/').pop();
      if (id) ids.push(id);
    }
    const next = data.link?.find(link => link.relation === 'next');
    url = next?.url ? toFhirPath(next.url) : undefined;
  }
  return ids;
}

/**
 * Fetches studies by id with their batches. No request for no ids.
 *
 * @param API - Axios instance.
 * @param ids - ResearchStudy ids.
 * @param today - Reference date, yyyy-mm-dd; defaults to an empty string.
 * @returns Study progress for the ids.
 */
export async function fetchStudiesByIds(
  API: AxiosInstance,
  ids: string[],
  today = ''
): Promise<StudyProgress[]> {
  if (ids.length === 0) return [];
  return fetchAllPages(
    API,
    `/fhir/ResearchStudy?_id=${ids.join(',')}&_include=ResearchStudy:protocol&_count=50`,
    today
  );
}
