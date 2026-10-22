import { describe, expect, it } from 'vitest';
import {
  questionnaireIdLabel,
  questionnaireIdOf,
  toCanonicalQuestionnaireUrl
} from '../questionnaire-url';

const CANONICAL = 'https://konsulin.care/fhir/Questionnaire';

describe('toCanonicalQuestionnaireUrl', () => {
  it('normalizes a bare questionnaire id', () => {
    expect(toCanonicalQuestionnaireUrl('phq2')).toBe(`${CANONICAL}/phq2`);
  });

  it('normalizes a relative reference', () => {
    expect(toCanonicalQuestionnaireUrl('Questionnaire/phq2')).toBe(
      `${CANONICAL}/phq2`
    );
  });

  it('normalizes the legacy app canonical namespace', () => {
    expect(
      toCanonicalQuestionnaireUrl(
        'https://app.konsulin.care/assessments/big-five-inventory'
      )
    ).toBe(`${CANONICAL}/big-five-inventory`);
  });

  it('keeps the canonical form unchanged', () => {
    expect(toCanonicalQuestionnaireUrl(`${CANONICAL}/phq2`)).toBe(
      `${CANONICAL}/phq2`
    );
  });

  it('strips a version suffix from a relative reference', () => {
    expect(toCanonicalQuestionnaireUrl('Questionnaire/phq2|1.0')).toBe(
      `${CANONICAL}/phq2`
    );
  });

  it('strips a version suffix from a canonical URL', () => {
    expect(toCanonicalQuestionnaireUrl(`${CANONICAL}/phq2|1.0`)).toBe(
      `${CANONICAL}/phq2`
    );
  });

  it('returns an empty string for empty input', () => {
    expect(toCanonicalQuestionnaireUrl('')).toBe('');
    expect(toCanonicalQuestionnaireUrl()).toBe('');
  });
});

describe('questionnaireIdOf', () => {
  it('extracts the id from every accepted form', () => {
    expect(questionnaireIdOf('phq2')).toBe('phq2');
    expect(questionnaireIdOf('Questionnaire/phq2')).toBe('phq2');
    expect(questionnaireIdOf('Questionnaire/phq2|1.0')).toBe('phq2');
    expect(
      questionnaireIdOf('https://app.konsulin.care/assessments/phq2')
    ).toBe('phq2');
    expect(questionnaireIdOf(`${CANONICAL}/phq2`)).toBe('phq2');
    expect(questionnaireIdOf(`${CANONICAL}/phq2|1.0`)).toBe('phq2');
  });

  it('returns null for empty input', () => {
    expect(questionnaireIdOf('')).toBeNull();
    expect(questionnaireIdOf()).toBeNull();
  });
});

describe('questionnaireIdLabel', () => {
  it('uppercases a hyphenated id, splitting hyphens into spaces', () => {
    expect(questionnaireIdLabel('phq-9')).toBe('PHQ 9');
    expect(questionnaireIdLabel('gad-7')).toBe('GAD 7');
  });

  it('uppercases a plain id without separators', () => {
    expect(questionnaireIdLabel('phq9')).toBe('PHQ9');
    expect(questionnaireIdLabel('ocean')).toBe('OCEAN');
  });

  it('handles empty input', () => {
    expect(questionnaireIdLabel('')).toBe('');
  });
});
