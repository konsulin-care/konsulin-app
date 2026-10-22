import type { Observation } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { extractObservation } from '../observation-extract';

describe('extractObservation', () => {
  it('parses LOINC 51855-5 as PatientNote', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      id: 'obs-1',
      status: 'final',
      code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] },
      valueString: 'Feeling unwell',
      note: [{ text: 'Note text' }],
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractObservation(obs);
    expect(result.type).toBe('PatientNote');
    expect(result.id).toBe('Observation/obs-1');
    expect(result.title).toBe('Feeling unwell');
    expect(result.result).toBe('Note text');
  });

  it('uses static "Patient Note" when valueString is missing', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      id: 'obs-2',
      status: 'final',
      code: { coding: [{ system: 'https://loinc.org', code: '51855-5' }] },
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractObservation(obs);
    expect(result.type).toBe('PatientNote');
    expect(result.title).toBe('Patient Note');
  });

  it('parses LOINC 67855-7 as PractitionerNote', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      id: 'obs-3',
      status: 'final',
      code: {
        coding: [
          {
            system: 'https://loinc.org',
            code: '67855-7',
            display: 'Practitioner Note'
          }
        ]
      },
      valueString: 'Note content',
      performer: [{ reference: 'Practitioner/dr-1' }],
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractObservation(obs);
    expect(result.type).toBe('PractitionerNote');
    expect(result.practitionerId).toBe('dr-1');
  });

  it('parses other LOINCs as generic Observation', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      id: 'obs-4',
      status: 'final',
      code: {
        coding: [
          { system: 'https://loinc.org', code: '12345-6', display: 'BP' }
        ]
      },
      valueString: '120/80',
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractObservation(obs);
    expect(result.type).toBe('Observation');
    expect(result.title).toBe('BP');
  });

  it('handles missing LOINC code gracefully', () => {
    const obs: Observation = {
      resourceType: 'Observation',
      id: 'obs-5',
      status: 'final',
      code: { coding: [] },
      meta: { lastUpdated: '2024-06-01T00:00:00Z' }
    };
    const result = extractObservation(obs);
    expect(result.type).toBe('Observation');
  });
});
