import { getAPI } from '@/services/api';
import { getQuestionnaireCategoryLabel } from '@/utils/fhir/questionnaire-category';
import { getQuestionnaireDuration } from '@/utils/fhir/service-duration';
import type { Bundle, Questionnaire } from 'fhir/r4';

/** Shape for questionnaire options used in comboboxes. */
export type QuestionnaireOption = {
  code: string;
  name: string;
  duration: number | null;
  category: string | null;
};

/** Fetches questionnaire library from FHIR API. */
export async function fetchLibraryQuestionnaires(): Promise<Questionnaire[]> {
  const API = await getAPI();
  const res = await API.get<Bundle>(
    '/fhir/Questionnaire?context=popular,regular&status=active&_elements=id,title,description,extension,useContext,code'
  );
  return (res.data.entry ?? []).map(e => e.resource as Questionnaire);
}

/** Maps raw questionnaires to combobox options with metadata. */
export function libraryOptionsFromQuery(
  qs: Questionnaire[]
): QuestionnaireOption[] {
  return qs.map(q => ({
    code: q.id ?? '',
    name: q.title ?? q.id ?? '',
    duration: getQuestionnaireDuration(q),
    category: getQuestionnaireCategoryLabel(q.useContext)
  }));
}
