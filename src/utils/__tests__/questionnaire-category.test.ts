import { describe, expect, it } from 'vitest';
import {
  getQuestionnaireCategoryCode,
  getQuestionnaireCategoryLabel
} from '../fhir/questionnaire-category';

const DOMAIN_CODING = {
  system: 'https://konsulin.id/fhir/CodeSystem/assessment-domain',
  code: 'mental-emotional-health',
  display: 'Mental & Emotional Health'
};

describe('getQuestionnaireCategoryCode', () => {
  it('returns code from useContext', () => {
    const useContext = [
      {
        code: {
          system: 'https://terminology.hl7.org/CodeSystem/usage-context',
          code: 'focus'
        },
        valueCodeableConcept: {
          coding: [DOMAIN_CODING]
        }
      }
    ];
    expect(getQuestionnaireCategoryCode(useContext)).toBe(
      'mental-emotional-health'
    );
  });

  it('returns null when no domain code found', () => {
    const useContext = [
      {
        valueCodeableConcept: {
          coding: [{ system: 'https://loinc.org', code: '44249-1' }]
        }
      }
    ];
    expect(getQuestionnaireCategoryCode(useContext)).toBeNull();
  });

  it('returns null when useContext is undefined', () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- explicit undefined input under test
    expect(getQuestionnaireCategoryCode(undefined)).toBeNull();
  });

  it('returns null when useContext is empty', () => {
    expect(getQuestionnaireCategoryCode([])).toBeNull();
  });
});

describe('getQuestionnaireCategoryLabel', () => {
  it('returns display text when present', () => {
    const useContext = [
      {
        valueCodeableConcept: {
          coding: [DOMAIN_CODING]
        }
      }
    ];
    expect(getQuestionnaireCategoryLabel(useContext)).toBe(
      'Mental & Emotional Health'
    );
  });

  it('falls back to code when no display text', () => {
    const useContext = [
      {
        valueCodeableConcept: {
          coding: [
            {
              system: 'https://konsulin.id/fhir/CodeSystem/assessment-domain',
              code: 'physical-health'
            }
          ]
        }
      }
    ];
    expect(getQuestionnaireCategoryLabel(useContext)).toBe('physical-health');
  });

  it('returns null when no domain coding', () => {
    expect(getQuestionnaireCategoryLabel([])).toBeNull();
  });
});
