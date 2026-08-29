import type { IBundleResponse } from '@/types/record';
import type { Bundle, Observation, QuestionnaireResponse } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  collectUniqueResources,
  parseRecordBundlePractitioner,
  parseRecordBundles
} from '../record-bundle';

// ---------------------------------------------------------------------------
// collectUniqueResources
// ---------------------------------------------------------------------------

describe('collectUniqueResources', () => {
  it('collects unique resources from nested bundles', () => {
    const innerQr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-1',
      status: 'completed',
      questionnaire: 'Questionnaire/phq9',
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const innerObs: Observation = {
      resourceType: 'Observation',
      id: 'obs-1',
      status: 'final',
      code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] },
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Bundle',
            type: 'searchset',
            entry: [{ resource: innerQr }, { resource: innerObs }]
          } as Bundle
        }
      ]
    };
    const result = collectUniqueResources(bundle);
    expect(result.size).toBe(2);
    expect(result.has('QuestionnaireResponse/qr-1')).toBe(true);
    expect(result.has('Observation/obs-1')).toBe(true);
  });

  it('deduplicates resources with same id', () => {
    const qr: QuestionnaireResponse = {
      resourceType: 'QuestionnaireResponse',
      id: 'qr-1',
      status: 'completed',
      questionnaire: 'Questionnaire/phq9',
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Bundle',
            type: 'searchset',
            entry: [{ resource: qr }, { resource: { ...qr, id: 'qr-1' } }]
          } as Bundle
        }
      ]
    };
    const result = collectUniqueResources(bundle);
    expect(result.size).toBe(1);
  });

  it('returns empty for non-bundle input', () => {
    const result = collectUniqueResources(undefined as unknown as Bundle);
    expect(result.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseRecordBundles
// ---------------------------------------------------------------------------

describe('parseRecordBundles', () => {
  it('returns empty for non-array input', () => {
    expect(
      parseRecordBundles(undefined as unknown as IBundleResponse[])
    ).toEqual([]);
    expect(parseRecordBundles(null as unknown as IBundleResponse[])).toEqual(
      []
    );
  });

  it('returns empty for empty array', () => {
    expect(parseRecordBundles([])).toEqual([]);
  });

  it('sorts records by lastUpdated ascending', () => {
    const obsA = {
      resourceType: 'Observation' as const,
      id: '1',
      status: 'final' as const,
      code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] },
      meta: { lastUpdated: '2024-01-01T00:00:00Z' }
    } as Observation;
    const obsB = {
      resourceType: 'Observation' as const,
      id: '2',
      status: 'final' as const,
      code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] },
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    } as Observation;

    const bundle: IBundleResponse = {
      resource: {
        resourceType: 'Bundle',
        total: 2,
        entry: [{ resource: obsA }, { resource: obsB }]
      } as Bundle
    };
    const result = parseRecordBundles([bundle]);
    expect(result.map(r => r.id)).toEqual(['Observation/1', 'Observation/2']);
  });

  it('skips bundles with no entries', () => {
    const result = parseRecordBundles([
      {
        resource: {
          resourceType: 'Bundle',
          total: 0,
          entry: []
        } as unknown as Bundle
      }
    ]);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseRecordBundlePractitioner
// ---------------------------------------------------------------------------

describe('parseRecordBundlePractitioner', () => {
  it('returns empty for non-bundle input', () => {
    expect(
      parseRecordBundlePractitioner(undefined as unknown as Bundle)
    ).toEqual([]);
  });

  it('classifies SOAP questionnaire as SOAP Notes', () => {
    const qr = {
      resourceType: 'QuestionnaireResponse' as const,
      id: 'soap-1',
      status: 'completed' as const,
      questionnaire: 'https://konsulin.care/fhir/Questionnaire/soap',
      author: { reference: 'Practitioner/dr-1' },
      meta: { lastUpdated: '2024-06-01T00:00:00Z' },
      item: []
    } as QuestionnaireResponse;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Bundle',
            type: 'searchset',
            entry: [{ resource: qr }]
          } as Bundle
        }
      ]
    };
    const result = parseRecordBundlePractitioner(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('SOAP Notes');
  });

  it('classifies non-SOAP questionnaire as QuestionnaireResponse', () => {
    const qr = {
      resourceType: 'QuestionnaireResponse' as const,
      id: 'qr-1',
      status: 'completed' as const,
      questionnaire: 'https://konsulin.care/fhir/Questionnaire/phq9',
      meta: { lastUpdated: '2024-06-01T00:00:00Z' },
      item: []
    } as QuestionnaireResponse;
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Bundle',
            type: 'searchset',
            entry: [{ resource: qr }]
          } as Bundle
        }
      ]
    };
    const result = parseRecordBundlePractitioner(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('QuestionnaireResponse');
  });
});
