import type { IRecord } from '@/types/record';
import type {
  Bundle,
  Condition,
  Observation,
  QuestionnaireResponse
} from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  parseConditionBundle,
  parseObservationBundle,
  parseQRBundle,
  resolveQuestionnaireTitle
} from '../parse-searchset-bundles';

/** Helper: build a minimal Observation searchset Bundle. */
function obsBundle(
  items: Array<{
    loinc: string;
    id: string;
    lastUpdated: string;
    authorRef?: string;
    valueString?: string;
  }>
): Bundle {
  const entry = items.map(i => {
    const coding = [{ system: 'https://loinc.org', code: i.loinc }];
    const obs: Observation = {
      resourceType: 'Observation',
      id: i.id,
      status: 'final',
      code: { coding },
      meta: { lastUpdated: i.lastUpdated },
      ...(i.valueString ? { valueString: i.valueString } : {})
    } as Observation;
    if (i.authorRef) {
      (
        obs as Observation & { performer: Array<{ reference: string }> }
      ).performer = [{ reference: i.authorRef }];
    }
    return { resource: obs };
  });
  return { resourceType: 'Bundle', type: 'searchset', entry } as Bundle;
}

/** Helper: build a Condition searchset Bundle. */
function condBundle(
  items: Array<{
    id: string;
    lastUpdated: string;
    codeText: string;
    evidence?: Array<{ codeTexts: string[] }>;
  }>
): Bundle {
  const entry = items.map(i => {
    const evidence = i.evidence?.map(e => ({
      code: e.codeTexts.map(t => ({ text: t }))
    }));
    const c: Condition = {
      resourceType: 'Condition',
      id: i.id,
      subject: { reference: 'Patient/pat-1' },
      code: { text: i.codeText },
      clinicalStatus: { coding: [{ code: 'active' }] },
      evidence,
      meta: { lastUpdated: i.lastUpdated }
    } as Condition;
    return { resource: c };
  });
  return { resourceType: 'Bundle', type: 'searchset', entry } as Bundle;
}

/** Helper: build a QuestionnaireResponse searchset Bundle. */
function qrBundle(
  items: Array<{
    id: string;
    lastUpdated: string;
    questionnaire: string;
    isSoap: boolean;
    authorRef?: string;
  }>
): Bundle {
  const entry = items.map(i => {
    const item = i.isSoap
      ? [
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
        ]
      : [
          {
            linkId: 'interpretation',
            item: [
              {
                linkId: 'result-brief',
                answer: [{ valueString: 'Score: 12' }]
              }
            ]
          }
        ];
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: i.id,
      status: 'completed',
      questionnaire: i.questionnaire,
      subject: { reference: 'Patient/pat-1' },
      meta: { lastUpdated: i.lastUpdated },
      item,
      ...(i.authorRef ? { author: { reference: i.authorRef } } : {})
    } as QuestionnaireResponse;
    return { resource: qr };
  });
  return { resourceType: 'Bundle', type: 'searchset', entry } as Bundle;
}

describe('parseQRBundle', () => {
  it('parses SOAP QuestionnaireResponse as SOAP Notes', () => {
    const b = qrBundle([
      {
        id: 'qr-1',
        lastUpdated: '2024-06-01T00:00:00Z',
        questionnaire: 'Questionnaire/soap',
        isSoap: true
      }
    ]);
    const result = parseQRBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('SOAP Notes');
    expect(result[0].resourceType).toBe('QuestionnaireResponse');
  });

  it('parses assessment QuestionnaireResponse', () => {
    const b = qrBundle([
      {
        id: 'qr-2',
        lastUpdated: '2024-06-01T00:00:00Z',
        questionnaire: 'Questionnaire/phq9',
        isSoap: false
      }
    ]);
    const result = parseQRBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('QuestionnaireResponse');
    expect(result[0].resourceType).toBe('QuestionnaireResponse');
  });

  it('skips practitioner-authored QRs when skipPractitionerAuthored is true', () => {
    const b = qrBundle([
      {
        id: 'qr-p',
        lastUpdated: '2024-06-01T00:00:00Z',
        questionnaire: 'Questionnaire/phq9',
        isSoap: false,
        authorRef: 'Patient/pat-1'
      },
      {
        id: 'qr-d',
        lastUpdated: '2024-06-02T00:00:00Z',
        questionnaire: 'Questionnaire/phq9',
        isSoap: false,
        authorRef: 'Practitioner/dr-1'
      }
    ]);
    const result = parseQRBundle(b, { skipPractitionerAuthored: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toContain('qr-p');
  });

  it('includes practitioner-authored QRs by default', () => {
    const b = qrBundle([
      {
        id: 'qr-p',
        lastUpdated: '2024-06-01T00:00:00Z',
        questionnaire: 'Questionnaire/phq9',
        isSoap: false,
        authorRef: 'Patient/pat-1'
      },
      {
        id: 'qr-d',
        lastUpdated: '2024-06-02T00:00:00Z',
        questionnaire: 'Questionnaire/phq9',
        isSoap: false,
        authorRef: 'Practitioner/dr-1'
      }
    ]);
    const result = parseQRBundle(b);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for null/undefined/empty input', () => {
    expect(parseQRBundle(null as unknown as Bundle)).toEqual([]);
    expect(parseQRBundle(undefined as unknown as Bundle)).toEqual([]);
    expect(
      parseQRBundle({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: []
      } as Bundle)
    ).toEqual([]);
  });

  it('extracts questionnaire ID from canonical title', () => {
    const record: IRecord = {
      type: 'QuestionnaireResponse',
      resourceType: 'QuestionnaireResponse',
      id: 'QuestionnaireResponse/qr-1',
      title: 'Questionnaire/phq9',
      result: 'Score: 12',
      lastUpdated: '2024-06-01T00:00:00Z'
    };
    expect(resolveQuestionnaireTitle(record)).toBe('phq9');
  });

  it('returns title as-is if not a canonical reference', () => {
    const record: IRecord = {
      type: 'QuestionnaireResponse',
      resourceType: 'QuestionnaireResponse',
      id: 'QuestionnaireResponse/qr-1',
      title: 'Already resolved title',
      result: 'Score: 12',
      lastUpdated: '2024-06-01T00:00:00Z'
    };
    expect(resolveQuestionnaireTitle(record)).toBe('Already resolved title');
  });
});

describe('parseConditionBundle', () => {
  it('parses Condition entries', () => {
    const b = condBundle([
      {
        id: 'cond-1',
        lastUpdated: '2024-06-01T00:00:00Z',
        codeText: 'Hypertension'
      }
    ]);
    const result = parseConditionBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Condition');
    expect(result[0].resourceType).toBe('Condition');
    expect(result[0].title).toBe('Hypertension');
  });

  it('renders evidence as markdown bullet list in result', () => {
    const b = condBundle([
      {
        id: 'cond-ev',
        lastUpdated: '2024-06-01T00:00:00Z',
        codeText: 'Asthma',
        evidence: [
          { codeTexts: ['Imaging confirms diagnosis'] },
          { codeTexts: ['Lab results show elevated markers'] }
        ]
      }
    ]);
    const result = parseConditionBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Condition');
    expect(result[0].result).toBe(
      '- Imaging confirms diagnosis\n- Lab results show elevated markers'
    );
  });

  it('handles multiple conditions', () => {
    const b = condBundle([
      { id: 'cond-1', lastUpdated: '2024-06-01T00:00:00Z', codeText: 'A' },
      { id: 'cond-2', lastUpdated: '2024-06-02T00:00:00Z', codeText: 'B' }
    ]);
    expect(parseConditionBundle(b)).toHaveLength(2);
  });

  it('returns empty for empty bundle', () => {
    expect(
      parseConditionBundle({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: []
      } as Bundle)
    ).toEqual([]);
  });
});

describe('parseObservationBundle', () => {
  it('parses LOINC 51855-5 as Patient Note with static title', () => {
    const b = obsBundle([
      { loinc: '51855-5', id: 'obs-1', lastUpdated: '2024-06-01T00:00:00Z' }
    ]);
    const result = parseObservationBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('PatientNote');
    expect(result[0].title).toBe('Patient Note');
  });

  it('parses LOINC 67855-7 as Practitioner Note', () => {
    const b = obsBundle([
      { loinc: '67855-7', id: 'obs-2', lastUpdated: '2024-06-01T00:00:00Z' }
    ]);
    const result = parseObservationBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('PractitionerNote');
  });

  it('parses other LOINCs as generic Observation', () => {
    const b = obsBundle([
      { loinc: '12345-6', id: 'obs-3', lastUpdated: '2024-06-01T00:00:00Z' }
    ]);
    const result = parseObservationBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Observation');
  });

  it('returns empty for empty bundle', () => {
    expect(
      parseObservationBundle({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: []
      } as Bundle)
    ).toEqual([]);
  });
});
