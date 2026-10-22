import type { IRecord } from '@/types/record';
import type { Bundle } from 'fhir/r4';
import { extractCondition } from './condition-extract';
import { extractObservation } from './observation-extract';
import { extractQuestionnaireResponse } from './qr-extract';

// Re-export extractors for consumers that need them directly
export { extractCondition } from './condition-extract';
export { extractObservation } from './observation-extract';
export {
  extractAnswerValue,
  extractBriefQuestionnaire,
  extractQuestionnaireResponse,
  extractSectionValues,
  extractSoapQuestionnaire,
  flattenItems,
  type AnswerPrimitive
} from './qr-extract';

/**
 * Extract the display-friendly questionnaire ID from a canonical title.
 *
 * @param record - The IRecord to resolve the title for.
 * @returns The bare questionnaire id, or the original title if not a reference.
 */
export function resolveQuestionnaireTitle(record: IRecord): string {
  if (record.type !== 'QuestionnaireResponse' && record.type !== 'SOAP Notes') {
    return record.title;
  }
  const title = record.title ?? '';
  // Inline check to avoid circular dependency with questionnaire-url
  const isQuestionnaireRef = /(^|\/)Questionnaire(\/|$|\|)/.test(title);
  if (!isQuestionnaireRef) return title;
  const segments = title.split('|')[0].split('/').filter(Boolean);
  return segments.at(-1) ?? title;
}

/**
 * Parse a QuestionnaireResponse searchset Bundle into IRecord[].
 *
 * @param bundle - FHIR searchset Bundle of QuestionnaireResponse resources.
 * @param opts.skipPractitionerAuthored - If true, filter out QRs authored by
 *   Practitioners (patient view). Default false.
 * @param opts.titleMap - Optional map of questionnaire id to display title.
 * @returns Array of IRecord objects.
 */
export function parseQRBundle(
  bundle: Bundle,
  opts?: {
    skipPractitionerAuthored?: boolean;
    titleMap?: Record<string, string>;
  }
): IRecord[] {
  if (!bundle?.entry) return [];

  const results: IRecord[] = [];

  for (const entry of bundle.entry) {
    const resource = entry.resource;
    if (resource?.resourceType !== 'QuestionnaireResponse' || !resource.id)
      continue;

    if (opts?.skipPractitionerAuthored) {
      const authorRef = resource.author?.reference;
      if (authorRef?.startsWith('Practitioner/')) continue;
    }

    const record = {
      ...extractQuestionnaireResponse(resource),
      resourceType: 'QuestionnaireResponse'
    } as IRecord;

    results.push(applyTitleMap(record, opts?.titleMap));
  }

  return results;
}

/**
 * Parse a Condition searchset Bundle into IRecord[].
 *
 * @param bundle - FHIR searchset Bundle of Condition resources.
 * @returns Array of IRecord objects.
 */
export function parseConditionBundle(bundle: Bundle): IRecord[] {
  if (!bundle?.entry) return [];

  const results: IRecord[] = [];

  for (const entry of bundle.entry) {
    const resource = entry.resource;
    if (resource?.resourceType !== 'Condition' || !resource.id) continue;

    results.push({
      ...extractCondition(resource),
      resourceType: 'Condition'
    } as IRecord);
  }

  return results;
}

/**
 * Parse an Observation searchset Bundle into IRecord[].
 *
 * @param bundle - FHIR searchset Bundle of Observation resources.
 * @returns Array of IRecord objects.
 */
export function parseObservationBundle(bundle: Bundle): IRecord[] {
  if (!bundle?.entry) return [];

  const results: IRecord[] = [];

  for (const entry of bundle.entry) {
    const resource = entry.resource;
    if (resource?.resourceType !== 'Observation' || !resource.id) continue;

    results.push({
      ...extractObservation(resource),
      resourceType: 'Observation'
    } as IRecord);
  }

  return results;
}

/**
 * Merge multiple IRecord arrays into a single sorted, deduplicated list.
 *
 * - Deduplicates by `${resourceType}/${id}` — the first occurrence wins.
 * - Sorts by lastUpdated descending with a stable tie-breaker by id.
 *
 * @param arrays - One or more IRecord[] arrays to merge.
 * @returns Merged and sorted IRecord array.
 */
export function mergeRecords(...arrays: IRecord[][]): IRecord[] {
  const seen = new Set<string>();
  const all: IRecord[] = [];

  for (const arr of arrays) {
    for (const record of arr) {
      const key = `${record.resourceType}/${record.id.split('/')[1] ?? record.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(record);
    }
  }

  // eslint-disable-next-line unicorn/no-array-sort
  return all.sort((a, b) => {
    const diff =
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}

/** Apply title map to a QuestionnaireResponse record if a display title exists. */
function applyTitleMap(
  record: IRecord,
  titleMap?: Record<string, string>
): IRecord {
  if (!titleMap) return record;
  const qId = resolveQuestionnaireTitle(record);
  if (titleMap[qId]) {
    return { ...record, title: titleMap[qId] };
  }
  return record;
}
