/**
 * Canonical questionnaire URL utilities.
 *
 * All QuestionnaireResponse.questionnaire fields and Questionnaire.url values
 * use the canonical namespace https://konsulin.care/fhir/Questionnaire/{id}.
 * Blaze only matches absolute canonical URLs for the `questionnaire` search
 * parameter, so every read and write must normalize to this form.
 */

/** Canonical questionnaire URL namespace for this deployment. */
export const CANONICAL_QUESTIONNAIRE_BASE =
  'https://konsulin.care/fhir/Questionnaire';

/**
 * Extracts the bare questionnaire id from any reference or canonical form:
 * bare id ("phq2"), relative reference ("Questionnaire/phq2"), the legacy
 * namespace ("https://app.konsulin.care/assessments/phq2"), the canonical
 * namespace, and any of those with a version suffix ("|1.0").
 *
 * @param ref - Questionnaire reference, canonical URL, or bare id.
 * @returns The bare questionnaire id, or null when absent.
 */
export function questionnaireIdOf(ref?: string): string | null {
  if (!ref) return null;
  const withoutVersion = ref.split('|')[0];
  const segments = withoutVersion.split('/').filter(Boolean);
  return segments.at(-1) ?? null;
}

/**
 * Normalizes any questionnaire reference form to the canonical URL
 * https://konsulin.care/fhir/Questionnaire/{id}. Version suffixes are
 * stripped. Empty input yields an empty string.
 *
 * @param ref - Questionnaire reference, canonical URL, or bare id.
 * @returns The canonical questionnaire URL, or '' when input is empty.
 */
export function toCanonicalQuestionnaireUrl(ref?: string): string {
  const id = questionnaireIdOf(ref);
  return id ? `${CANONICAL_QUESTIONNAIRE_BASE}/${id}` : '';
}

/**
 * True when a string is a questionnaire reference of some form (relative or
 * canonical), as opposed to a plain display title.
 *
 * @param value - String to test.
 * @returns True when the string contains a Questionnaire path segment.
 */
export function isQuestionnaireReference(value?: string): boolean {
  if (!value) return false;
  return /(^|\/)Questionnaire(\/|$|\|)/.test(value);
}

/**
 * All-caps display label for a raw questionnaire id used when a title is
 * unavailable. Hyphens become spaces: `phq-9` → `PHQ 9`, `phq9` → `PHQ9`.
 *
 * @param id - Raw questionnaire id.
 * @returns The uppercased label.
 */
export function questionnaireIdLabel(id: string): string {
  return id
    .split('-')
    .map(part => part.toUpperCase())
    .join(' ');
}
