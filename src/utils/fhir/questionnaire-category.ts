import type { Questionnaire, UsageContext } from 'fhir/r4';

// eslint-disable-next-line unicorn/prefer-https
const DOMAIN_SYSTEM = 'http://konsulin.care/fhir/CodeSystem/assessment-domain';
const CONTEXT_SYSTEM =
  // eslint-disable-next-line unicorn/prefer-https
  'http://blaze.konsulin.care/fhir/CodeSystem/assessment-context';
const USAGE_CONTEXT_SYSTEM =
  // eslint-disable-next-line unicorn/prefer-https
  'http://terminology.hl7.org/CodeSystem/usage-context';

/** Build a useContext entry whose coding matches the given system. */
function buildUsageContextEntry(
  system: string,
  code: string,
  display?: string
): UsageContext {
  return {
    code: { system: USAGE_CONTEXT_SYSTEM, code: 'focus' },
    valueCodeableConcept: {
      coding: [{ system, code, ...(display ? { display } : {}) }]
    }
  };
}

/**
 * Set the assessment domain category on a Questionnaire.
 *
 * Replaces any existing assessment-domain useContext coding and adds the
 * "regular" assessment-context entry (used by the curated /assessments
 * listing) when absent. Preserves all unrelated useContext entries.
 *
 * @param questionnaire - The Questionnaire resource to modify
 * @param code - Assessment domain code (e.g. "physical-health")
 * @param label - Display label for the domain
 * @returns A new Questionnaire object with the category context set
 */
export function setQuestionnaireCategory(
  questionnaire: Questionnaire,
  code: string,
  label: string
): Questionnaire {
  const useContext = questionnaire.useContext ?? [];
  let hadDomain = false;

  const updatedContext = useContext.map(ctx => {
    if (
      !ctx.valueCodeableConcept?.coding?.some(c => c.system === DOMAIN_SYSTEM)
    ) {
      return ctx;
    }
    hadDomain = true;
    const coding = ctx.valueCodeableConcept.coding;
    return {
      ...ctx,
      valueCodeableConcept: {
        ...ctx.valueCodeableConcept,
        coding: [
          ...coding.filter(c => c.system !== DOMAIN_SYSTEM),
          { system: DOMAIN_SYSTEM, code, display: label }
        ]
      }
    };
  });

  let next = hadDomain
    ? updatedContext
    : [...updatedContext, buildUsageContextEntry(DOMAIN_SYSTEM, code, label)];

  const hasRegular = next.some(ctx =>
    ctx.valueCodeableConcept?.coding?.some(
      c => c.system === CONTEXT_SYSTEM && c.code === 'regular'
    )
  );
  if (!hasRegular) {
    next = [...next, buildUsageContextEntry(CONTEXT_SYSTEM, 'regular')];
  }

  return { ...questionnaire, useContext: next };
}

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
