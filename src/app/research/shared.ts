import { getAPI } from '@/services/api';
import type { Bundle, Questionnaire } from 'fhir/r4';

/** Fetches questionnaire library from FHIR API. */
export async function fetchLibraryQuestionnaires(): Promise<Questionnaire[]> {
  const API = await getAPI();
  const res = await API.get<Bundle>(
    '/fhir/Questionnaire?context=popular,regular&status=active&_elements=id,title,description,extension'
  );
  return (res.data.entry ?? []).map(e => e.resource as Questionnaire);
}

/** Maps raw questionnaires to combobox options. */
export function libraryOptionsFromQuery(
  qs: Questionnaire[]
): { code: string; name: string }[] {
  return qs.map(q => ({ code: q.id ?? '', name: q.title ?? q.id ?? '' }));
}
