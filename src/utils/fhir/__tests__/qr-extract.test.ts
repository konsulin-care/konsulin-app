import type {
  QuestionnaireResponse,
  QuestionnaireResponseItem,
  QuestionnaireResponseItemAnswer
} from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  extractAnswerValue,
  extractBriefQuestionnaire,
  extractQuestionnaireResponse,
  extractSectionValues,
  extractSoapQuestionnaire,
  flattenItems
} from '../qr-extract';

// ---------------------------------------------------------------------------
// flattenItems
// ---------------------------------------------------------------------------

describe('flattenItems', () => {
  it('flattens a single node with no children', () => {
    const node: QuestionnaireResponseItem = { linkId: 'a', text: 'A' };
    expect(flattenItems(node)).toEqual([node]);
  });

  it('recursively flattens nested items', () => {
    const root: QuestionnaireResponseItem = {
      linkId: 'root',
      text: 'Root',
      item: [
        {
          linkId: 'child',
          text: 'Child',
          item: [{ linkId: 'grandchild', text: 'Grandchild' }]
        }
      ]
    };
    const flat = flattenItems(root);
    expect(flat).toHaveLength(3);
    expect(flat.map(i => i.linkId)).toEqual(['root', 'child', 'grandchild']);
  });
});

// ---------------------------------------------------------------------------
// extractAnswerValue
// ---------------------------------------------------------------------------

describe('extractAnswerValue', () => {
  it('extracts valueString', () => {
    const ans: QuestionnaireResponseItemAnswer = { valueString: 'hello' };
    expect(extractAnswerValue(ans)).toBe('hello');
  });

  it('extracts valueBoolean', () => {
    const ans: QuestionnaireResponseItemAnswer = { valueBoolean: true };
    expect(extractAnswerValue(ans)).toBe(true);
  });

  it('extracts valueInteger', () => {
    const ans: QuestionnaireResponseItemAnswer = { valueInteger: 42 };
    expect(extractAnswerValue(ans)).toBe(42);
  });

  it('extracts valueDate', () => {
    const ans: QuestionnaireResponseItemAnswer = { valueDate: '2024-01-01' };
    expect(extractAnswerValue(ans)).toBe('2024-01-01');
  });

  it('extracts valueQuantity as string', () => {
    const ans: QuestionnaireResponseItemAnswer = {
      valueQuantity: { value: 10, unit: 'mg' }
    };
    expect(extractAnswerValue(ans)).toBe('10 mg');
  });

  it('extracts valueCoding display', () => {
    const ans: QuestionnaireResponseItemAnswer = {
      valueCoding: { display: 'Depression' }
    };
    expect(extractAnswerValue(ans)).toBe('Depression');
  });

  it('returns null for empty answer', () => {
    const ans: QuestionnaireResponseItemAnswer = {};
    expect(extractAnswerValue(ans)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractSectionValues
// ---------------------------------------------------------------------------

describe('extractSectionValues', () => {
  it('extracts values from section items', () => {
    const section: QuestionnaireResponseItem = {
      linkId: 'section-1',
      text: 'Subjective',
      item: [
        {
          linkId: 'q1',
          text: 'Complaint',
          answer: [{ valueString: 'Headache' }]
        }
      ]
    };
    const values = extractSectionValues(section);
    expect(values).toHaveLength(1);
    expect(values[0].section).toBe('Subjective');
    expect(values[0].label).toBe('Complaint');
    expect(values[0].value).toBe('Headache');
  });

  it('skips items without answers', () => {
    const section: QuestionnaireResponseItem = {
      linkId: 'section-1',
      text: 'Empty',
      item: [{ linkId: 'q1', text: 'No answer' }]
    };
    expect(extractSectionValues(section)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractSoapQuestionnaire
// ---------------------------------------------------------------------------

describe('extractSoapQuestionnaire', () => {
  it('extracts SOAP sections', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-soap',
      status: 'completed',
      questionnaire: 'https://konsulin.care/fhir/Questionnaire/soap',
      item: [
        {
          linkId: 'subjective',
          text: 'Subjective',
          item: [
            {
              linkId: 'complaint',
              text: 'Complaint',
              answer: [{ valueString: 'Headache' }]
            }
          ]
        }
      ],
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractSoapQuestionnaire(qr);
    expect(result.type).toBe('SOAP Notes');
    expect(result.id).toBe('QuestionnaireResponse/qr-soap');
    expect(Array.isArray(result.result)).toBe(true);
  });

  it('extracts practitionerId from author', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-2',
      status: 'completed',
      questionnaire: 'https://konsulin.care/fhir/Questionnaire/soap',
      author: { reference: 'Practitioner/dr-1' },
      item: [],
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractSoapQuestionnaire(qr);
    expect(result.practitionerId).toBe('dr-1');
  });
});

// ---------------------------------------------------------------------------
// extractBriefQuestionnaire
// ---------------------------------------------------------------------------

describe('extractBriefQuestionnaire', () => {
  it('extracts result-brief from interpretation item', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-brief',
      status: 'completed',
      questionnaire: 'Questionnaire/phq9',
      item: [
        {
          linkId: 'interpretation',
          item: [
            {
              linkId: 'result-brief',
              answer: [{ valueString: 'Mild depression' }]
            }
          ]
        }
      ],
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractBriefQuestionnaire(qr);
    expect(result.type).toBe('QuestionnaireResponse');
    expect(result.result).toBe('Mild depression');
  });

  it('returns empty string when no result-brief', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-empty',
      status: 'completed',
      questionnaire: 'Questionnaire/phq9',
      item: [],
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractBriefQuestionnaire(qr);
    expect(result.result).toBe('');
  });
});

// ---------------------------------------------------------------------------
// extractQuestionnaireResponse (dispatch)
// ---------------------------------------------------------------------------

describe('extractQuestionnaireResponse', () => {
  it('dispatches SOAP to extractSoapQuestionnaire', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-dispatch',
      status: 'completed',
      questionnaire: 'https://konsulin.care/fhir/Questionnaire/soap',
      item: [],
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractQuestionnaireResponse(qr);
    expect(result.type).toBe('SOAP Notes');
  });

  it('dispatches non-SOAP to extractBriefQuestionnaire', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-dispatch2',
      status: 'completed',
      questionnaire: 'Questionnaire/phq9',
      item: [],
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractQuestionnaireResponse(qr);
    expect(result.type).toBe('QuestionnaireResponse');
  });
});
