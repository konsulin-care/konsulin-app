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
  parseQRBundle,
  resolveQuestionnaireTitle
} from '../searchset-bundle';

// ---------------------------------------------------------------------------
// parseQRBundle
// ---------------------------------------------------------------------------

describe('parseQRBundle', () => {
  it('returns empty array for empty bundle', () => {
    expect(
      parseQRBundle({ resourceType: 'Bundle', type: 'searchset', entry: [] })
    ).toEqual([]);
  });

  it('returns empty array for undefined entry', () => {
    expect(
      parseQRBundle({ resourceType: 'Bundle', type: 'searchset' })
    ).toEqual([]);
  });

  it('classifies SOAP questionnaire as SOAP Notes', () => {
    const qr = {
      resourceType: 'QuestionnaireResponse' as const,
      id: 'qr-1',
      status: 'completed' as const,
      questionnaire: 'https://konsulin.care/fhir/Questionnaire/soap',
      meta: { lastUpdated: '2024-06-01T00:00:00Z' },
      item: []
    } as QuestionnaireResponse;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: qr }]
    };
    const result = parseQRBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('SOAP Notes');
  });

  it('classifies non-SOAP questionnaire as QuestionnaireResponse', () => {
    const qr = {
      resourceType: 'QuestionnaireResponse' as const,
      id: 'qr-2',
      status: 'completed' as const,
      questionnaire: 'https://konsulin.care/fhir/Questionnaire/phq9',
      meta: { lastUpdated: '2024-06-01T00:00:00Z' },
      item: []
    } as QuestionnaireResponse;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: qr }]
    };
    const result = parseQRBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('QuestionnaireResponse');
  });

  it('applies titleMap when provided', () => {
    const qr = {
      resourceType: 'QuestionnaireResponse' as const,
      id: 'qr-3',
      status: 'completed' as const,
      questionnaire: 'https://konsulin.care/fhir/Questionnaire/phq9',
      meta: { lastUpdated: '2024-06-01T00:00:00Z' },
      item: []
    } as QuestionnaireResponse;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: qr }]
    };
    const result = parseQRBundle(bundle, {
      titleMap: { phq9: 'Depression Screen' }
    });
    expect(result[0].title).toBe('Depression Screen');
  });

  it('filters practitioner-authored QRs when skipPractitionerAuthored is true', () => {
    const patientQr = {
      resourceType: 'QuestionnaireResponse' as const,
      id: 'qr-patient',
      status: 'completed' as const,
      questionnaire: 'Questionnaire/phq9',
      author: { reference: 'Patient/pat-1' },
      meta: { lastUpdated: '2024-06-01T00:00:00Z' },
      item: []
    } as QuestionnaireResponse;
    const practitionerQr = {
      resourceType: 'QuestionnaireResponse' as const,
      id: 'qr-practitioner',
      status: 'completed' as const,
      questionnaire: 'Questionnaire/phq9',
      author: { reference: 'Practitioner/dr-1' },
      meta: { lastUpdated: '2024-06-01T00:00:00Z' },
      item: []
    } as QuestionnaireResponse;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: patientQr }, { resource: practitionerQr }]
    };
    const result = parseQRBundle(bundle, {
      skipPractitionerAuthored: true
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('QuestionnaireResponse/qr-patient');
  });
});

// ---------------------------------------------------------------------------
// parseConditionBundle
// ---------------------------------------------------------------------------

describe('parseConditionBundle', () => {
  it('returns empty for empty bundle', () => {
    expect(
      parseConditionBundle({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: []
      })
    ).toEqual([]);
  });

  it('extracts condition with evidence as bullet list', () => {
    const cond = {
      resourceType: 'Condition' as const,
      id: 'cond-1',
      subject: { reference: 'Patient/pat-1' },
      code: { text: 'Headache' },
      evidence: [
        {
          code: [{ text: 'MRI shows lesion' }, { text: 'Patient reports pain' }]
        }
      ],
      meta: { lastUpdated: '2025-01-01T00:00:00Z' }
    } as Condition;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: cond }]
    };
    const result = parseConditionBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Condition');
    expect(result[0].result).toBe('- MRI shows lesion\n- Patient reports pain');
  });

  it('handles condition without evidence', () => {
    const cond = {
      resourceType: 'Condition' as const,
      id: 'cond-2',
      subject: { reference: 'Patient/pat-1' },
      code: { text: 'Test' },
      meta: { lastUpdated: '2025-01-01T00:00:00Z' }
    } as Condition;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: cond }]
    };
    const result = parseConditionBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].result).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseObservationBundle
// ---------------------------------------------------------------------------

describe('parseObservationBundle', () => {
  it('returns empty for empty bundle', () => {
    expect(
      parseObservationBundle({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: []
      })
    ).toEqual([]);
  });

  it('parses LOINC 51855-5 as PatientNote', () => {
    const obs = {
      resourceType: 'Observation' as const,
      id: 'obs-1',
      status: 'final' as const,
      code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] },
      valueString: 'Feeling unwell',
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    } as Observation;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: obs }]
    };
    const result = parseObservationBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('PatientNote');
    expect(result[0].title).toBe('Feeling unwell');
  });

  it('parses LOINC 67855-7 as PractitionerNote', () => {
    const obs = {
      resourceType: 'Observation' as const,
      id: 'obs-2',
      status: 'final' as const,
      code: { coding: [{ system: 'https://loinc.org', code: '67855-7' }] },
      valueString: 'Note text',
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    } as Observation;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: obs }]
    };
    const result = parseObservationBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('PractitionerNote');
  });

  it('parses other LOINCs as generic Observation', () => {
    const obs = {
      resourceType: 'Observation' as const,
      id: 'obs-3',
      status: 'final' as const,
      code: { coding: [{ system: 'https://loinc.org', code: '12345-6' }] },
      valueString: 'Some value',
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    } as Observation;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: obs }]
    };
    const result = parseObservationBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Observation');
  });
});

// ---------------------------------------------------------------------------
// mergeRecords
// ---------------------------------------------------------------------------

describe('mergeRecords', () => {
  it('merges and sorts by lastUpdated desc', () => {
    const a: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-1',
        title: 'A',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ];
    const b: IRecord[] = [
      {
        type: 'Condition',
        resourceType: 'Condition',
        id: 'Condition/c-1',
        title: 'B',
        result: '',
        lastUpdated: '2024-06-03T00:00:00Z'
      }
    ];
    const merged = mergeRecords(a, b);
    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('Condition/c-1');
    expect(merged[1].id).toBe('QuestionnaireResponse/qr-1');
  });

  it('deduplicates by resourceType/id', () => {
    const a: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-1',
        title: 'A',
        result: '',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ];
    const b: IRecord[] = [
      {
        type: 'QR',
        resourceType: 'QuestionnaireResponse',
        id: 'QuestionnaireResponse/qr-1',
        title: 'B',
        result: '',
        lastUpdated: '2024-06-02T00:00:00Z'
      }
    ];
    const merged = mergeRecords(a, b);
    expect(merged).toHaveLength(1);
    // First occurrence wins
    expect(merged[0].title).toBe('A');
  });

  it('returns empty for no input', () => {
    expect(mergeRecords()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// resolveQuestionnaireTitle
// ---------------------------------------------------------------------------

describe('resolveQuestionnaireTitle', () => {
  it('resolves canonical URL to bare id', () => {
    const record: IRecord = {
      type: 'SOAP Notes',
      resourceType: 'QuestionnaireResponse',
      id: 'QuestionnaireResponse/soap-1',
      title: 'https://konsulin.care/fhir/Questionnaire/soap',
      result: [],
      lastUpdated: '2024-06-01T00:00:00Z'
    };
    expect(resolveQuestionnaireTitle(record)).toBe('soap');
  });

  it('returns title as-is for non-questionnaire records', () => {
    const record: IRecord = {
      type: 'Condition',
      resourceType: 'Condition',
      id: 'Condition/c-1',
      title: 'Headache',
      result: '',
      lastUpdated: '2024-06-01T00:00:00Z'
    };
    expect(resolveQuestionnaireTitle(record)).toBe('Headache');
  });

  it('returns title as-is when not a questionnaire reference', () => {
    const record: IRecord = {
      type: 'SOAP Notes',
      resourceType: 'QuestionnaireResponse',
      id: 'QuestionnaireResponse/soap-1',
      title: 'SOAP Note',
      result: [],
      lastUpdated: '2024-06-01T00:00:00Z'
    };
    expect(resolveQuestionnaireTitle(record)).toBe('SOAP Note');
  });
});
