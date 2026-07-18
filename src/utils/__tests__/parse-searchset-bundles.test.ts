import type { IRecord } from '@/types/record';
import type {
  Bundle,
  Condition,
  Observation,
  QuestionnaireResponse
} from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  mergeRecords,
  parseConditionBundle,
  parseObservationBundle,
  parseQRBundle
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
  items: Array<{ id: string; lastUpdated: string; codeText: string }>
): Bundle {
  const entry = items.map(i => {
    const c: Condition = {
      resourceType: 'Condition',
      id: i.id,
      subject: { reference: 'Patient/pat-1' },
      code: { text: i.codeText },
      clinicalStatus: { coding: [{ code: 'active' }] },
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

  it('returns empty array for empty bundle', () => {
    const b = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    } as Bundle;
    expect(parseQRBundle(b)).toEqual([]);
  });

  it('returns empty array for null/undefined input', () => {
    expect(parseQRBundle(null as unknown as Bundle)).toEqual([]);
    expect(parseQRBundle(undefined as unknown as Bundle)).toEqual([]);
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

  it('handles multiple conditions', () => {
    const b = condBundle([
      { id: 'cond-1', lastUpdated: '2024-06-01T00:00:00Z', codeText: 'A' },
      { id: 'cond-2', lastUpdated: '2024-06-02T00:00:00Z', codeText: 'B' }
    ]);
    expect(parseConditionBundle(b)).toHaveLength(2);
  });

  it('returns empty array for empty bundle', () => {
    const b = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    } as Bundle;
    expect(parseConditionBundle(b)).toEqual([]);
  });
});

describe('parseObservationBundle', () => {
  it('parses LOINC 51855-5 as Patient Note', () => {
    const b = obsBundle([
      { loinc: '51855-5', id: 'obs-1', lastUpdated: '2024-06-01T00:00:00Z' }
    ]);
    const result = parseObservationBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Patient Note');
  });

  it('parses LOINC 67855-7 as Practitioner Note', () => {
    const b = obsBundle([
      { loinc: '67855-7', id: 'obs-2', lastUpdated: '2024-06-01T00:00:00Z' }
    ]);
    const result = parseObservationBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Practitioner Note');
  });

  it('parses other LOINCs as generic Observation', () => {
    const b = obsBundle([
      { loinc: '12345-6', id: 'obs-3', lastUpdated: '2024-06-01T00:00:00Z' }
    ]);
    const result = parseObservationBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Observation');
  });

  it('returns empty array for empty bundle', () => {
    const b = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    } as Bundle;
    expect(parseObservationBundle(b)).toEqual([]);
  });
});

describe('mergeRecords', () => {
  it('merges multiple arrays and sorts by lastUpdated desc', () => {
    const records1: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QR/qr-1',
        title: 'QR1',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      },
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QR/qr-2',
        title: 'QR2',
        result: '',
        lastUpdated: '2024-06-03T00:00:00Z'
      }
    ];
    const records2: IRecord[] = [
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-1',
        title: 'C1',
        result: '',
        lastUpdated: '2024-06-02T00:00:00Z'
      },
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-2',
        title: 'C2',
        result: '',
        lastUpdated: '2024-06-04T00:00:00Z'
      }
    ];
    const merged = mergeRecords(records1, records2);
    expect(merged).toHaveLength(4);
    // Sorted by lastUpdated desc
    expect(merged[0].id).toBe('Condition/c-2'); // 2024-06-04
    expect(merged[1].id).toBe('QR/qr-2'); // 2024-06-03
    expect(merged[2].id).toBe('Condition/c-1'); // 2024-06-02
    expect(merged[3].id).toBe('QR/qr-1'); // 2024-06-01
  });

  it('deduplicates by resourceType/id', () => {
    const a: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-1',
        title: 'QR1',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ];
    const b: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-1',
        title: 'QR1',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ];
    const merged = mergeRecords(a, b);
    expect(merged).toHaveLength(1);
  });

  it('returns empty for empty input', () => {
    expect(mergeRecords()).toEqual([]);
    expect(mergeRecords([])).toEqual([]);
    expect(mergeRecords([], [])).toEqual([]);
  });

  it('uses stable tie-breaker by id when timestamps are equal', () => {
    const a: IRecord[] = [
      {
        type: 'A',
        resourceType: 'TypeA',
        id: 'TypeA/a-2',
        title: 'a2',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      },
      {
        type: 'A',
        resourceType: 'TypeA',
        id: 'TypeA/a-1',
        title: 'a1',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ];
    const b: IRecord[] = [
      {
        type: 'B',
        resourceType: 'TypeB',
        id: 'TypeB/b-1',
        title: 'b1',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ];
    const merged = mergeRecords(a, b);
    expect(merged).toHaveLength(3);
    // All same timestamp, tie-break by id
    expect(merged[0].id).toBe('TypeA/a-1');
    expect(merged[1].id).toBe('TypeA/a-2');
    expect(merged[2].id).toBe('TypeB/b-1');
  });

  it('handles mixed chronological merging correctly (C3 inserts between C2 and QR2)', () => {
    const page1: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-1',
        title: 'QR1',
        result: '',
        lastUpdated: '2024-06-10T00:00:00Z'
      },
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-1',
        title: 'C1',
        result: '',
        lastUpdated: '2024-06-09T00:00:00Z'
      },
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-2',
        title: 'C2',
        result: '',
        lastUpdated: '2024-06-08T00:00:00Z'
      },
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-2',
        title: 'QR2',
        result: '',
        lastUpdated: '2024-06-05T00:00:00Z'
      }
    ];
    const page2: IRecord[] = [
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-3',
        title: 'C3',
        result: '',
        lastUpdated: '2024-06-07T00:00:00Z'
      },
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-4',
        title: 'C4',
        result: '',
        lastUpdated: '2024-06-04T00:00:00Z'
      },
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-3',
        title: 'QR3',
        result: '',
        lastUpdated: '2024-06-06T00:00:00Z'
      },
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-4',
        title: 'QR4',
        result: '',
        lastUpdated: '2024-06-03T00:00:00Z'
      }
    ];
    const merged = mergeRecords(page1, page2);
    expect(merged).toHaveLength(8);
    // Expected order (desc by lastUpdated):
    // QR1 (6/10), C1 (6/9), C2 (6/8), C3 (6/7), QR3 (6/6), QR2 (6/5), C4 (6/4), QR4 (6/3)
    expect(merged[0].title).toBe('QR1');
    expect(merged[1].title).toBe('C1');
    expect(merged[2].title).toBe('C2');
    expect(merged[3].title).toBe('C3');
    expect(merged[4].title).toBe('QR3');
    expect(merged[5].title).toBe('QR2');
    expect(merged[6].title).toBe('C4');
    expect(merged[7].title).toBe('QR4');
  });
});
