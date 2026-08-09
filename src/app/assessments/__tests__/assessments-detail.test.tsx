import { describe, expect, it } from 'vitest';
import { resolveDetailPageTitle } from '../assessments-detail';

describe('resolveDetailPageTitle', () => {
  it('returns the questionnaire title verbatim when present', () => {
    expect(
      resolveDetailPageTitle([{ resource: { title: 'PHQ-9' } }], 'phq-9')
    ).toBe('PHQ-9');
  });

  it('falls back to the all-caps questionnaire id when the title is missing', () => {
    expect(resolveDetailPageTitle([{ resource: {} }], 'gad-7')).toBe('GAD 7');
    expect(resolveDetailPageTitle(null, 'ocean')).toBe('OCEAN');
  });
});
