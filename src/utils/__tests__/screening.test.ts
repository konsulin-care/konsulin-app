import { describe, expect, it } from 'vitest';
import { getScreeningAnswers, resolveSpecialtyFromAnswer } from '../screening';

describe('resolveSpecialtyFromAnswer', () => {
  it('resolves every seeded answer code to its specialty', () => {
    const expected: Record<string, string> = {
      anxiety: 'psychology',
      mood: 'psychiatry',
      child: 'pediatrics',
      cognitive: 'neuropsychology',
      general: 'general-practice',
      heart: 'cardiology',
      skin: 'dermatology',
      metabolic: 'endocrinology',
      women: 'obgyn',
      bone: 'orthopedics',
      ear: 'ent',
      eye: 'ophthalmology'
    };
    for (const [code, specialty] of Object.entries(expected)) {
      expect(resolveSpecialtyFromAnswer(code)).toBe(specialty);
    }
  });

  it('returns null for unknown and empty codes', () => {
    expect(resolveSpecialtyFromAnswer('not-a-code')).toBeNull();
    expect(resolveSpecialtyFromAnswer('')).toBeNull();
    expect(resolveSpecialtyFromAnswer(null)).toBeNull();
  });
});

describe('getScreeningAnswers', () => {
  it('returns answers whose specialty codes all resolve', () => {
    const answers = getScreeningAnswers();
    expect(answers.length).toBe(12);
    for (const answer of answers) {
      expect(resolveSpecialtyFromAnswer(answer.code)).toBe(answer.specialty);
    }
  });
});
