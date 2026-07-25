import type { Bundle, Observation } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { parseObservationBundle } from '../parse-searchset-bundles';

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

describe('parseObservationBundle', () => {
  it('parses LOINC 51855-5 as Patient Note with dynamic title (valueString)', () => {
    const bundle = obsBundle([
      {
        loinc: '51855-5',
        id: 'obs-1',
        lastUpdated: '2024-06-01T00:00:00Z',
        valueString: 'Feeling unwell today'
      }
    ]);
    const result = parseObservationBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('PatientNote');
    expect(result[0].title).toBe('Feeling unwell today');
  });

  it('uses static "Patient Note" label when LOINC 51855-5 has no valueString', () => {
    const bundle = obsBundle([
      {
        loinc: '51855-5',
        id: 'obs-4',
        lastUpdated: '2024-06-01T00:00:00Z'
      }
    ]);
    const result = parseObservationBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('PatientNote');
    expect(result[0].title).toBe('Patient Note');
  });

  it('parses LOINC 67855-7 as Practitioner Note', () => {
    const bundle = obsBundle([
      { loinc: '67855-7', id: 'obs-2', lastUpdated: '2024-06-01T00:00:00Z' }
    ]);
    const result = parseObservationBundle(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('PractitionerNote');
  });

  it('parses other LOINCs as generic Observation', () => {
    const bundle = obsBundle([
      { loinc: '12345-6', id: 'obs-3', lastUpdated: '2024-06-01T00:00:00Z' }
    ]);
    const result = parseObservationBundle(bundle);
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
