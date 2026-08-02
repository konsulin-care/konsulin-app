import { describe, expect, it } from 'vitest';
import { ASSESSMENT_CATEGORIES } from '../assessment-categories';

describe('ASSESSMENT_CATEGORIES', () => {
  it('defines exactly the seven assessment domains', () => {
    expect(ASSESSMENT_CATEGORIES).toHaveLength(7);
    expect(ASSESSMENT_CATEGORIES.map(c => c.code)).toEqual([
      'physical-health',
      'mental-emotional-health',
      'social-health-relationships',
      'functional-capacity',
      'meaning-purpose-fulfilment',
      'health-behaviours-lifestyle',
      'environmental-contextual'
    ]);
  });

  it('gives every category a display label', () => {
    for (const category of ASSESSMENT_CATEGORIES) {
      expect(category.label.length).toBeGreaterThan(0);
    }
  });
});
