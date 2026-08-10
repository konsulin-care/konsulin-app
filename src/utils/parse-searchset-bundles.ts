import type { IRecord, ISoapSection } from '@/types/record';
import { isLoincSystem } from '@/utils/fhir';
import {
  isQuestionnaireReference,
  questionnaireIdOf
} from '@/utils/fhir/questionnaire-url';
import type {
  Bundle,
  Coding,
  Condition,
  Observation,
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  QuestionnaireResponseItemAnswer
} from 'fhir/r4';

// ---- Observation extraction ----

/** Extract a Patient Note or Practitioner Note from an Observation. */
// eslint-disable-next-line complexity
function extractObservation(resource: Observation): Partial<IRecord> {
  const codeList = resource.code?.coding ?? [];
  const loincCode = codeList.find((c: Coding) => isLoincSystem(c.system))?.code;

  const practitionerRef = resource.performer?.[0]?.reference;
  const practitionerId = practitionerRef?.split('/')[1] ?? null;

  if (loincCode === '51855-5') {
    const notes = (resource.note ?? []).map(n => n.text).join('\n\n');
    return {
      type: 'PatientNote',
      id: `${resource.resourceType}/${resource.id}`,
      title: resource.valueString ?? 'Patient Note',
      result: notes,
      lastUpdated: resource.meta?.lastUpdated ?? '',
      practitionerId: practitionerId ?? undefined
    };
  }

  if (loincCode === '67855-7') {
    return {
      type: 'PractitionerNote',
      id: `${resource.resourceType}/${resource.id}`,
      title: codeList[0]?.display ?? '',
      result: resource.valueString ?? '',
      lastUpdated: resource.meta?.lastUpdated ?? '',
      practitionerId: practitionerId ?? undefined
    };
  }

  return {
    type: 'Observation',
    id: `${resource.resourceType}/${resource.id}`,
    title: codeList[0]?.display ?? resource.code?.text ?? 'Observation',
    result: resource.valueString ?? resource.valueCodeableConcept?.text ?? '',
    lastUpdated: resource.meta?.lastUpdated ?? ''
  };
}

// ---- QuestionnaireResponse extraction ----

/** Recursively flatten a QuestionnaireResponseItem tree. */
function flattenItems(
  node: QuestionnaireResponseItem
): QuestionnaireResponseItem[] {
  const children = (node.item ?? []).flatMap(item => flattenItems(item));
  return [node, ...children];
}

/** Extract a primitive value from an answer. */
type AnswerPrimitive = string | boolean | number | null;

// eslint-disable-next-line complexity, sonarjs/function-return-type
function extractAnswerValue(
  ans: QuestionnaireResponseItemAnswer
): AnswerPrimitive {
  if ('valueString' in ans && ans.valueString != null) return ans.valueString;
  if ('valueBoolean' in ans && ans.valueBoolean != null)
    return ans.valueBoolean;
  if ('valueInteger' in ans && ans.valueInteger != null)
    return ans.valueInteger;
  if ('valueDate' in ans && ans.valueDate != null) return ans.valueDate;
  if ('valueQuantity' in ans && ans.valueQuantity != null) {
    return `${ans.valueQuantity.value ?? ''} ${ans.valueQuantity.unit ?? ''}`;
  }
  if ('valueCoding' in ans && ans.valueCoding != null) {
    return ans.valueCoding.display ?? null;
  }
  return null;
}

/** Extract section values from a questionnaire item section. */
function extractSectionValues(section: QuestionnaireResponseItem): Array<{
  section: string | undefined;
  label: string | undefined;
  value: AnswerPrimitive;
}> {
  const values: Array<{
    section: string | undefined;
    label: string | undefined;
    value: AnswerPrimitive;
  }> = [];

  for (const item of section.item ?? []) {
    for (const field of flattenItems(item)) {
      if (!field.answer) continue;
      for (const ans of field.answer) {
        const val = extractAnswerValue(ans);
        if (val != null) {
          values.push({ section: section.text, label: field.text, value: val });
        }
      }
    }
  }

  return values;
}

/** Extract a SOAP questionnaire with section values. */
function extractSoapQuestionnaire(
  resource: QuestionnaireResponse
): Partial<IRecord> {
  const values: ISoapSection[] = [];
  const practitionerId = resource.author?.reference?.split('/')[1] ?? null;

  for (const section of resource.item ?? []) {
    const extracted = extractSectionValues(section);
    for (const v of extracted) {
      values.push({
        section: v.section ?? '',
        label: v.label ?? '',
        value: String(v.value ?? '')
      });
    }
  }

  return {
    type: 'SOAP Notes',
    id: `${resource.resourceType}/${resource.id}`,
    title: resource.questionnaire ?? '',
    result: values,
    lastUpdated: resource.meta?.lastUpdated ?? '',
    practitionerId: practitionerId ?? undefined
  };
}

/** Extract the brief result from a non-SOAP questionnaire. */
function extractBriefQuestionnaire(
  resource: QuestionnaireResponse
): Partial<IRecord> {
  const brief =
    resource.item
      ?.find(i => i.linkId === 'interpretation')
      ?.item?.find(ii => ii.linkId === 'result-brief')?.answer?.[0]
      ?.valueString ?? '';

  return {
    type: 'QuestionnaireResponse',
    id: `${resource.resourceType}/${resource.id}`,
    title: resource.questionnaire ?? '',
    result: brief,
    lastUpdated: resource.meta?.lastUpdated ?? ''
  };
}

/** Extract a QuestionnaireResponse into an IRecord. */
function extractQuestionnaireResponse(
  resource: QuestionnaireResponse
): Partial<IRecord> {
  if (questionnaireIdOf(resource.questionnaire) === 'soap') {
    return extractSoapQuestionnaire(resource);
  }
  return extractBriefQuestionnaire(resource);
}

// ---- Condition extraction ----

function extractCondition(resource: Condition): Partial<IRecord> {
  const evidenceBullets = (resource.evidence ?? [])
    .flatMap(e => (e.code ?? []).map(c => c.text).filter(Boolean))
    .map(t => `- ${t}`)
    .join('\n');

  return {
    type: 'Condition',
    id: `${resource.resourceType}/${resource.id}`,
    title: resource.code?.text ?? '',
    result: evidenceBullets,
    lastUpdated: resource.meta?.lastUpdated ?? ''
  };
}

/** Extract the display-friendly questionnaire ID from a canonical title. */
export function resolveQuestionnaireTitle(record: IRecord): string {
  if (record.type !== 'QuestionnaireResponse' && record.type !== 'SOAP Notes') {
    return record.title;
  }
  const title = record.title ?? '';
  if (!isQuestionnaireReference(title)) return title;
  return questionnaireIdOf(title) ?? title;
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

// ---- Bundle parsers ----

/**
 * Parse a QuestionnaireResponse searchset Bundle into IRecord[].
 *
 * @param bundle - FHIR searchset Bundle of QuestionnaireResponse resources
 * @param opts.skipPractitionerAuthored - If true, filter out QRs authored by
 *   Practitioners (patient view). Default false.
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

// ---- Merge utility ----

/**
 * Merge multiple IRecord arrays into a single sorted, deduplicated list.
 *
 * - Deduplicates by `${resourceType}/${id}` — the first occurrence wins.
 * - Sorts by lastUpdated descending with a stable tie-breaker by id.
 *
 * @param arrays - One or more IRecord[] arrays to merge
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
    // Stable tie-breaker by id
    return a.id.localeCompare(b.id);
  });
}
