// eslint-disable-next-line unicorn/prefer-https
const DOMAIN_SYSTEM = 'http://konsulin.care/fhir/CodeSystem/assessment-domain';

/**
 * Extract the assessment category code from a Questionnaire's useContext array.
 *
 * Searches for a useContext entry whose valueCodeableConcept.coding
 * matches the assessment-domain CodeSystem. Returns the code (e.g.
 * "mental-emotional-health") or null.
 *
 * @param useContext - Questionnaire.useContext array
 * @returns Category code string, or null
 */
export function getQuestionnaireCategoryCode(
  useContext:
    | Array<{
        code?: { system?: string; code?: string };
        valueCodeableConcept?: {
          coding?: Array<{ system?: string; code?: string }>;
        };
      }>
    | undefined
): string | null {
  for (const ctx of useContext ?? []) {
    const coding = ctx.valueCodeableConcept?.coding ?? [];
    for (const c of coding) {
      if (c.system === DOMAIN_SYSTEM && c.code) {
        return c.code;
      }
    }
  }
  return null;
}

/**
 * Extract the display text for the assessment domain from useContext.
 *
 * Returns the display text from the matching coding, falls back to code,
 * or null if no match found.
 *
 * @param useContext - Questionnaire.useContext array
 * @returns Display label, or null
 */
export function getQuestionnaireCategoryLabel(
  useContext:
    | Array<{
        code?: { system?: string; code?: string };
        valueCodeableConcept?: {
          coding?: Array<{ system?: string; code?: string; display?: string }>;
        };
      }>
    | undefined
): string | null {
  for (const ctx of useContext ?? []) {
    const coding = ctx.valueCodeableConcept?.coding ?? [];
    for (const c of coding) {
      if (c.system === DOMAIN_SYSTEM) {
        return c.display ?? c.code ?? null;
      }
    }
  }
  return null;
}
