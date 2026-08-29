import type { QuestionnaireItem, QuestionnaireResponseItem } from 'fhir/r4';

/** Builds a required, answerable questionnaire item. */
export const focusable = (
  linkId: string,
  overrides?: Partial<QuestionnaireItem>
): QuestionnaireItem => ({
  linkId,
  text: linkId,
  type: 'choice',
  required: true,
  ...overrides
});

/** Builds an optional (non-required) questionnaire item. */
export const nonRequired = (
  linkId: string,
  overrides?: Partial<QuestionnaireItem>
): QuestionnaireItem => ({
  linkId,
  text: linkId,
  type: 'choice',
  required: false,
  ...overrides
});

/** Builds a display-only questionnaire item. */
export const display = (
  linkId: string,
  overrides?: Partial<QuestionnaireItem>
): QuestionnaireItem => ({
  linkId,
  text: linkId,
  type: 'display',
  ...overrides
});

/** Builds a read-only questionnaire item. */
export const readOnly = (
  linkId: string,
  overrides?: Partial<QuestionnaireItem>
): QuestionnaireItem => ({
  linkId,
  text: linkId,
  type: 'choice',
  required: true,
  readOnly: true,
  ...overrides
});

/** Builds an answered questionnaire response item. */
export const answered = (linkId: string): QuestionnaireResponseItem => ({
  linkId,
  text: linkId,
  answer: [{ valueString: 'yes' }]
});

/** Builds an unanswered questionnaire response item. */
export const unanswered = (linkId: string): QuestionnaireResponseItem => ({
  linkId,
  text: linkId
});

/** Flattens nested questionnaire items into a linkId-keyed map. */
export const toItemMap = (
  items: QuestionnaireItem[]
): Record<string, QuestionnaireItem> => {
  const map: Record<string, QuestionnaireItem> = {};
  for (const item of items) {
    map[item.linkId] = item;
    if (item.item) Object.assign(map, toItemMap(item.item));
  }
  return map;
};
