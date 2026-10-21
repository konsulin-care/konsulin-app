/** Canonical assessment domain codes used across the assessments feature. */
export const ASSESSMENT_CATEGORY_CODES = [
  'physical-health',
  'mental-emotional-health',
  'social-health-relationships',
  'functional-capacity',
  'meaning-purpose-fulfilment',
  'health-behaviours-lifestyle',
  'environmental-contextual'
] as const;

export const ASSESSMENT_CATEGORIES = ASSESSMENT_CATEGORY_CODES.map(code => ({
  code,
  label: code
}));
