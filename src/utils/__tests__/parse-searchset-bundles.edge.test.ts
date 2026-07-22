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
  parseQRBundle
} from '../parse-searchset-bundles';

describe('parseQRBundle edge cases', () => {
  it('returns a record even for QR with empty items', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-no-items',
      status: 'completed',
      questionnaire: 'Questionnaire/phq9',
      subject: { reference: 'Patient/pat-1' },
      meta: { lastUpdated: '2024-06-01T00:00:00Z' },
      item: []
    } as QuestionnaireResponse;
    const b: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: qr }]
    } as Bundle;
    const result = parseQRBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeTruthy();
    expect(result[0].type).toBe('QuestionnaireResponse');
  });
});

describe('parseConditionBundle edge cases', () => {
  it('does not throw when Condition has no evidence field', () => {
    const cond: Condition = {
      resourceType: 'Condition',
      id: 'cond-min',
      subject: { reference: 'Patient/pat-1' },
      code: { text: 'Minimal' },
      clinicalStatus: { coding: [{ code: 'active' }] },
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    } as Condition;
    const b: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: cond }]
    } as Bundle;

    expect(() => parseConditionBundle(b)).not.toThrow();

    const result = parseConditionBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Condition');
    expect(result[0].result).toBe('\\-');
  });

  it('does not throw when Condition has evidence set to undefined explicitly', () => {
    const cond: Condition = {
      resourceType: 'Condition',
      id: 'cond-undef-evidence',
      subject: { reference: 'Patient/pat-1' },
      code: { text: 'Test' },
      clinicalStatus: { coding: [{ code: 'active' }] },
      evidence: undefined,
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    } as unknown as Condition;
    const b: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: cond }]
    } as Bundle;

    expect(() => parseConditionBundle(b)).not.toThrow();

    const result = parseConditionBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0].result).toBe('\\-');
  });
});

describe('parseObservationBundle edge cases', () => {
  it('returns a record even for Observation with no LOINC code', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      id: 'obs-no-loinc',
      status: 'final',
      code: {},
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    } as Observation;
    const b: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: obs }]
    } as Bundle;
    const result = parseObservationBundle(b);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeTruthy();
    expect(result[0].type).toBe('Observation');
  });
});
