import type { IRecord, ISoapSection } from '@/types/record';
import { questionnaireIdOf } from '@/utils/fhir/questionnaire-url';
import type {
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  QuestionnaireResponseItemAnswer
} from 'fhir/r4';

/** Primitive answer value types. */
export type AnswerPrimitive = string | boolean | number | null;

/**
 * Recursively flatten a QuestionnaireResponseItem tree into a flat list.
 *
 * @param node - The root item to flatten.
 * @returns Flat array of all items (root first, then children depth-first).
 */
export function flattenItems(
  node: QuestionnaireResponseItem
): QuestionnaireResponseItem[] {
  const children = (node.item ?? []).flatMap(item => flattenItems(item));
  return [node, ...children];
}

/**
 * Extract a primitive value from a QuestionnaireResponseItemAnswer.
 *
 * @param ans - The answer to extract a value from.
 * @returns The extracted value, or null if none matches.
 */
// eslint-disable-next-line complexity
export function extractAnswerValue(
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

/**
 * Extract section values from a questionnaire item section.
 *
 * @param section - The section item to extract values from.
 * @returns Array of { section, label, value } tuples.
 */
export function extractSectionValues(
  section: QuestionnaireResponseItem
): Array<{
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

/**
 * Extract a SOAP questionnaire with section values.
 *
 * @param resource - The QuestionnaireResponse resource (SOAP).
 * @returns Partial IRecord with type 'SOAP Notes' and sectioned result.
 */
export function extractSoapQuestionnaire(
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

/**
 * Extract the brief result from a non-SOAP questionnaire.
 *
 * @param resource - The QuestionnaireResponse resource (non-SOAP).
 * @returns Partial IRecord with type 'QuestionnaireResponse'.
 */
export function extractBriefQuestionnaire(
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

/**
 * Extract a QuestionnaireResponse into an IRecord, dispatching to SOAP
 * or brief extraction based on the questionnaire reference.
 *
 * @param resource - The QuestionnaireResponse resource.
 * @returns Partial IRecord.
 */
export function extractQuestionnaireResponse(
  resource: QuestionnaireResponse
): Partial<IRecord> {
  if (questionnaireIdOf(resource.questionnaire) === 'soap') {
    return extractSoapQuestionnaire(resource);
  }
  return extractBriefQuestionnaire(resource);
}

/**
 * Extract the trimmed result brief string from a QuestionnaireResponse.
 *
 * @param qr - The QuestionnaireResponse to extract from.
 * @returns The trimmed result brief, or empty string if not found.
 */
export function extractResultBrief(qr: QuestionnaireResponse): string {
  return (
    qr.item
      ?.find(i => i.linkId === 'interpretation')
      ?.item?.find(ii => ii.linkId === 'result-brief')
      ?.answer?.[0]?.valueString?.trim() ?? ''
  );
}

/**
 * Update the interpretation item in a QuestionnaireResponse with a new
 * result-brief value. Preserves existing non-result-brief sub-items.
 *
 * @param qr - The original QuestionnaireResponse.
 * @param resultBrief - The new result brief value to set.
 * @returns A new QuestionnaireResponse with the updated interpretation item.
 */
export function updateQRInterpretationItem(
  qr: QuestionnaireResponse,
  resultBrief: string
): QuestionnaireResponse {
  const interpretationItem = qr.item.find(
    (i: QuestionnaireResponseItem) => i.linkId === 'interpretation'
  );

  const updatedInterpretationItem = {
    ...interpretationItem,
    item: [
      ...(interpretationItem?.item ?? []).filter(
        (i: QuestionnaireResponseItem) => i.linkId !== 'result-brief'
      ),
      {
        linkId: 'result-brief',
        answer: [{ valueString: resultBrief }]
      }
    ]
  };

  return {
    ...qr,
    item: qr.item.map((item: QuestionnaireResponseItem) =>
      item.linkId === 'interpretation' ? updatedInterpretationItem : item
    )
  };
}
