import type { Appointment, Bundle } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  extractAppointmentLocations,
  extractResources
} from '../appointment-extract';

describe('extractResources', () => {
  it('extracts resources of a given type', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        { resource: { resourceType: 'Appointment', id: 'a-1' } as Appointment },
        { resource: { resourceType: 'Location', id: 'loc-1' } },
        { resource: { resourceType: 'Appointment', id: 'a-2' } as Appointment }
      ]
    };
    const result = extractResources<Appointment>(bundle, 'Appointment');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a-1');
  });

  it('returns empty for undefined bundle', () => {
    expect(extractResources(undefined, 'Appointment')).toEqual([]);
  });

  it('returns empty for empty entry', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: []
    };
    expect(extractResources(bundle, 'Appointment')).toEqual([]);
  });
});

describe('extractAppointmentLocations', () => {
  it('extracts date and location from appointments', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Appointment',
            id: 'a-1',
            start: '2024-06-15T10:00:00Z',
            participant: [
              { actor: { reference: 'Location/loc-1' }, status: 'accepted' }
            ]
          } as Appointment
        }
      ]
    };
    const result = extractAppointmentLocations(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2024-06-15');
    expect(result[0].locationRef).toBe('Location/loc-1');
  });

  it('handles appointment without location', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Appointment',
            id: 'a-2',
            start: '2024-06-15T10:00:00Z',
            participant: []
          } as Appointment
        }
      ]
    };
    const result = extractAppointmentLocations(bundle);
    expect(result[0].locationRef).toBeUndefined();
  });

  it('handles appointment without start date', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: {
            resourceType: 'Appointment',
            id: 'a-3',
            participant: []
          } as Appointment
        }
      ]
    };
    const result = extractAppointmentLocations(bundle);
    expect(result[0].date).toBeNull();
  });
});
