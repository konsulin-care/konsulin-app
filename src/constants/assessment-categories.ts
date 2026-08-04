/** Canonical assessment domains used across the assessments feature. */
export const ASSESSMENT_CATEGORIES = [
  { code: 'physical-health', label: 'Physical Health' },
  {
    code: 'mental-emotional-health',
    label: 'Mental & Emotional Health'
  },
  {
    code: 'social-health-relationships',
    label: 'Social Health & Relationships'
  },
  { code: 'functional-capacity', label: 'Functional Capacity' },
  {
    code: 'meaning-purpose-fulfilment',
    label: 'Meaning, Purpose & Fulfilment'
  },
  {
    code: 'health-behaviours-lifestyle',
    label: 'Health Behaviours & Lifestyle'
  },
  {
    code: 'environmental-contextual',
    label: 'Environmental & Contextual'
  }
] as const;
