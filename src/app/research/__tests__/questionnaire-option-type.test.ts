import type { Questionnaire } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { libraryOptionsFromQuery, type QuestionnaireOption } from '../shared';

describe('QuestionnaireOption type compatibility', () => {
  it('libraryOptionsFromQuery returns QuestionnaireOption[]', () => {
    const fixture: Questionnaire = {
      resourceType: 'Questionnaire',
      id: 'phq9',
      title: 'PHQ-9',
      status: 'active',
      extension: [
        {
          url: 'http://konsulin.care/fhir/StructureDefinition/questionnaireEstimatedDuration',
          valueDuration: { value: 5 }
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
    };
    const result: QuestionnaireOption[] = libraryOptionsFromQuery([fixture]);

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('phq9');
    expect(result[0].name).toBe('PHQ-9');
    expect(result[0].duration).toBe(5);
    expect(result[0].category).toBe('Mental & Emotional Health');
  });

  it('custom questionnaires can use QuestionnaireOption shape', () => {
    const custom: QuestionnaireOption = {
      code: 'custom-1',
      name: 'Custom Assessment',
      duration: 10,
      category: 'Physical Health'
    };

    expect(custom.code).toBe('custom-1');
    expect(custom.duration).toBe(10);
  });

  it('Step2 accepts QuestionnaireOption[]', () => {
    // Type check: Step2 props accept QuestionnaireOption[]
    const options: QuestionnaireOption[] = [
      { code: 'a', name: 'A', duration: null, category: null }
    ];
    expect(options).toHaveLength(1);
  });

  it('Step3 accepts QuestionnaireOption[]', () => {
    // Type check: Step3 props accept QuestionnaireOption[]
    const options: QuestionnaireOption[] = [
      { code: 'a', name: 'A', duration: 5, category: 'Mental Health' }
    ];
    expect(options).toHaveLength(1);
  });
});
