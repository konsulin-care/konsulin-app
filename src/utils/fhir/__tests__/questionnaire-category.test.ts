import type { Questionnaire } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  getQuestionnaireCategoryCode,
  getQuestionnaireCategoryLabel,
  setQuestionnaireCategory
} from '../questionnaire-category';

const baseQuestionnaire: Questionnaire = {
  resourceType: 'Questionnaire',
  id: 'test',
  status: 'active'
};

describe('setQuestionnaireCategory', () => {
  it('adds assessment domain and regular context', () => {
    const result = setQuestionnaireCategory(
      baseQuestionnaire,
      'physical-health',
      'Physical Health'
    );

    expect(result.useContext).toHaveLength(2);
    expect(getQuestionnaireCategoryCode(result.useContext)).toBe(
      'physical-health'
    );
    expect(getQuestionnaireCategoryLabel(result.useContext)).toBe(
      'Physical Health'
    );
    // Should have regular context
    expect(
      result.useContext?.some(ctx =>
        ctx.valueCodeableConcept?.coding?.some(c => c.code === 'regular')
      )
    ).toBe(true);
  });

  it('adds research context when context parameter is research', () => {
    const result = setQuestionnaireCategory(
      baseQuestionnaire,
      'physical-health',
      'Physical Health',
      'research'
    );

    expect(result.useContext).toHaveLength(2);
    // Should have research context, not regular
    expect(
      result.useContext?.some(ctx =>
        ctx.valueCodeableConcept?.coding?.some(c => c.code === 'research')
      )
    ).toBe(true);
    expect(
      result.useContext?.some(ctx =>
        ctx.valueCodeableConcept?.coding?.some(c => c.code === 'regular')
      )
    ).toBe(false);
  });

  it('preserves existing unrelated useContext entries', () => {
    const withExisting: Questionnaire = {
      ...baseQuestionnaire,
      useContext: [
        {
          code: { system: 'other-system', code: 'other' },
          valueCodeableConcept: {
            coding: [{ system: 'other-system', code: 'value' }]
          }
        }
      ]
    };

    const result = setQuestionnaireCategory(
      withExisting,
      'physical-health',
      'Physical Health'
    );

    // Should preserve the existing entry and add domain + context
    expect(result.useContext).toHaveLength(3);
    expect(
      result.useContext?.some(ctx =>
        ctx.valueCodeableConcept?.coding?.some(c => c.system === 'other-system')
      )
    ).toBe(true);
  });
});
