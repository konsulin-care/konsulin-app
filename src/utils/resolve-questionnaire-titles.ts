import { getAPI } from '@/services/api';
import type { IRecord } from '@/types/record';
import type { QueryClient } from '@tanstack/react-query';
import type { Bundle, Questionnaire } from 'fhir/r4';
import { resolveQuestionnaireTitle } from './parse-searchset-bundles';

export type ResolveTitleOptions = {
  queryClient: QueryClient;
  signal?: AbortSignal;
};

/** True when the record type participates in questionnaire title resolution. */
function isQuestionnaireRecord(record: IRecord): boolean {
  return (
    record.type === 'QuestionnaireResponse' || record.type === 'SOAP Notes'
  );
}

/**
 * Batch-fetch Questionnaire titles for questionnaire-based records
 * (QuestionnaireResponse and SOAP Notes).
 *
 * Collects all unique unresolved questionnaire IDs (canonical references
 * like "Questionnaire/phq9"), batch-fetches their title fields via
 * `GET /fhir/Questionnaire?_id=a,b,c&_elements=title`, seeds individual
 * cache entries per ID, and returns records with resolved display titles.
 *
 * Records whose title is already non-canonical (not matching "Questionnaire/{id}")
 * are returned unchanged.
 */
export async function resolveQuestionnaireTitles(
  records: IRecord[],
  opts: ResolveTitleOptions
): Promise<IRecord[]> {
  const { queryClient, signal } = opts;

  // Collect unique questionnaire IDs that need resolution
  const neededIds = new Set<string>();

  for (const r of records) {
    if (!isQuestionnaireRecord(r)) continue;
    const qId = resolveQuestionnaireTitle(r);
    // Only resolve if title is still a reference (relative or canonical)
    if (qId !== r.title) {
      neededIds.add(qId);
    }
  }

  if (neededIds.size === 0) return records;

  const allIds = [...neededIds];

  // Filter out IDs already in cache
  const uncachedIds = allIds.filter(
    id => !queryClient.getQueryData(['questionnaire', id, 'title'])
  );

  if (uncachedIds.length > 0) {
    const api = await getAPI();
    const url = `/fhir/Questionnaire?_id=${uncachedIds.join(',')}&_elements=title`;
    const { data } = await api.get<Bundle>(url, { signal });

    // Seed individual cache entries from batch response
    for (const entry of data.entry ?? []) {
      const questionnaire = entry.resource as Questionnaire;
      if (questionnaire?.id) {
        queryClient.setQueryData(
          ['questionnaire', questionnaire.id, 'title'],
          questionnaire.title ?? questionnaire.id
        );
      }
    }
  }

  // Build title map from cache (now populated)
  const titleMap: Record<string, string> = {};
  for (const id of allIds) {
    const cached = queryClient.getQueryData<string>([
      'questionnaire',
      id,
      'title'
    ]);
    if (cached) titleMap[id] = cached;
  }

  // Apply title map to records
  return records.map(r => {
    if (!isQuestionnaireRecord(r)) return r;
    const qId = resolveQuestionnaireTitle(r);
    const displayTitle = titleMap[qId];
    if (displayTitle) return { ...r, title: displayTitle };
    return r;
  });
}
