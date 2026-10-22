import type { Questionnaire } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { libraryOptionsFromQuery } from '../shared';

function buildQuestionnaire(
  overrides: Partial<Questionnaire> = {}
): Questionnaire {
  return {
    resourceType: 'Questionnaire',
    status: 'active',
    ...overrides
  };
}

describe('libraryOptionsFromQuery', () => {
  it('returns code, name, duration, and category for each questionnaire', () => {
    const q = buildQuestionnaire({
      id: 'gad7',
      title: 'GAD-7',
      extension: [
        {
          url: 'http://konsulin.care/fhir/StructureDefinition/questionnaireEstimatedDuration',
          valueDuration: {
            value: 5,
            system: 'https://unitsofmeasure.org',
            code: 'min'
          }
        }
      ],
      useContext: [
        {
          code: {
            system: 'http://terminology.hl7.org/CodeSystem/usage-context',
            code: 'focus'
          },
          valueCodeableConcept: {
            coding: [
              {
                system:
                  'http://konsulin.care/fhir/CodeSystem/assessment-domain',
                code: 'mental-emotional-health',
                display: 'Mental & Emotional Health'
              }
            ]
          }
        }
      ]
    });

    const result = libraryOptionsFromQuery([q]);

    expect(result).toEqual([
      {
        code: 'gad7',
        name: 'GAD-7',
        duration: 5,
        category: 'Mental & Emotional Health'
      }
    ]);
  });

  it('returns null duration and category when extensions are missing', () => {
    const q = buildQuestionnaire({
      id: 'phq9',
      title: 'PHQ-9'
    });

    const result = libraryOptionsFromQuery([q]);

    expect(result).toEqual([
      {
        code: 'phq9',
        name: 'PHQ-9',
        duration: null,
        category: null
      }
    ]);
  });

  it('handles multiple questionnaires', () => {
    const q1 = buildQuestionnaire({ id: 'q1', title: 'Q1' });
    const q2 = buildQuestionnaire({ id: 'q2', title: 'Q2' });

    const result = libraryOptionsFromQuery([q1, q2]);

    expect(result).toHaveLength(2);
    expect(result[0].code).toBe('q1');
    expect(result[1].code).toBe('q2');
  });

  it('returns QuestionnaireOption[] compatible with existing consumers', () => {
    const q = buildQuestionnaire({ id: 'test', title: 'Test' });
    const result = libraryOptionsFromQuery([q]);

    // Type check: code and name are strings (existing consumer contract)
    const code: string = result[0].code;
    const name: string = result[0].name;
    expect(code).toBe('test');
    expect(name).toBe('Test');

    // New fields are present
    expect(result[0]).toHaveProperty('duration');
    expect(result[0]).toHaveProperty('category');
  });
});
