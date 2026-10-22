import type { IBundleResponse } from '@/types/record';
import type { Bundle, Observation } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { parseRecordBundles } from './fhir/record-bundle';

function makeObservation(
  overrides: Partial<Observation> & { id: string; lastUpdated?: string }
): Observation {
  return {
    resourceType: 'Observation',
    status: 'final',
    code: {
      coding: [{ system: 'https://loinc.org', code: '51855-5' }]
    },
    meta: overrides.lastUpdated
      ? { lastUpdated: overrides.lastUpdated }
      : undefined,
    id: overrides.id,
    ...overrides
  };
}

function makeBundle(observations: Observation[]): IBundleResponse {
  return {
    resource: {
      resourceType: 'Bundle',
      total: observations.length,
      entry: observations.map(obs => ({
        resource: obs
      }))
    } as Bundle
  };
}

describe('parseRecordBundles', () => {
  it('returns empty array for non-array input', () => {
    expect(parseRecordBundles(undefined as IBundleResponse[])).toEqual([]);
    expect(parseRecordBundles(null as IBundleResponse[])).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(parseRecordBundles([])).toEqual([]);
  });

  it('sorts records by lastUpdated ascending', () => {
    const obsA = makeObservation({
      id: '1',
      lastUpdated: '2024-01-01T00:00:00Z'
    });
    const obsB = makeObservation({
      id: '2',
      lastUpdated: '2024-06-01T00:00:00Z'
    });
    const obsC = makeObservation({
      id: '3',
      lastUpdated: '2024-03-01T00:00:00Z'
    });

    const result = parseRecordBundles([makeBundle([obsA, obsB, obsC])]);
    expect(result.map(r => r.id)).toEqual([
      'Observation/1',
      'Observation/3',
      'Observation/2'
    ]);
  });

  it('handles undefined lastUpdated without throwing', () => {
    const obsA = makeObservation({
      id: '1',
      lastUpdated: '2024-01-01T00:00:00Z'
    });
    const obsB = makeObservation({
      id: '2',
      lastUpdated: undefined
    });
    const obsC = makeObservation({
      id: '3',
      lastUpdated: '2024-03-01T00:00:00Z'
    });

    const result = parseRecordBundles([makeBundle([obsA, obsB, obsC])]);
    expect(result).toHaveLength(3);
    expect(result.map(r => r.id)).toContain('Observation/1');
    expect(result.map(r => r.id)).toContain('Observation/2');
    expect(result.map(r => r.id)).toContain('Observation/3');
  });

  it('handles all undefined lastUpdated stably', () => {
    const obsA = makeObservation({
      id: '1',
      lastUpdated: undefined
    });
    const obsB = makeObservation({
      id: '2',
      lastUpdated: undefined
    });

    const result = parseRecordBundles([makeBundle([obsA, obsB])]);
    expect(result).toHaveLength(2);
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

  it('skips bundles with wrong resourceType', () => {
    const result = parseRecordBundles([
      {
        resource: { resourceType: 'NotBundle' } as unknown as Bundle
      }
    ]);
    expect(result).toEqual([]);
  });
});
