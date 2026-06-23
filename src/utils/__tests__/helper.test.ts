import type { Patient } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { parseFhirProfile } from '../helper';

const mockPatient: Patient = {
  resourceType: 'Patient',
  id: 'pat-123',
  active: true,
  birthDate: '1990-01-15',
  gender: 'male',
  telecom: [
    { system: 'phone', value: '+628123456789' },
    { system: 'email', value: 'test@example.com' }
  ],
  name: [
    {
      given: ['John', 'M.'],
      family: 'Doe'
    }
  ],
  address: [
    {
      line: ['Jl. Sudirman No. 1'],
      city: 'Jakarta',
      district: 'Central Jakarta',
      postalCode: '10110'
    }
  ],
  identifier: [
    {
      system: 'https://login.konsulin.care/userid',
      value: 'user-abc'
    }
  ],
  photo: [{ url: 'https://example.com/photo.jpg' }]
};

describe('parseFhirProfile', () => {
  it('extracts phone, email, and name from Patient', () => {
    const result = parseFhirProfile(mockPatient);

    expect(result.fhirId).toBe('pat-123');
    expect(result.resourceType).toBe('Patient');
    expect(result.phone).toBe('+628123456789');
    expect(result.email).toBe('test@example.com');
    expect(result.firstName).toBe('John M.');
    expect(result.lastName).toBe('Doe');
    expect(result.userId).toBe('user-abc');
  });

  it('extracts address fields', () => {
    const result = parseFhirProfile(mockPatient);

    expect(result.addresses).toEqual(['Jl. Sudirman No. 1']);
    expect(result.city).toBe('Jakarta');
    expect(result.district).toBe('Central Jakarta');
    expect(result.postalCode).toBe('10110');
  });

  it('handles missing optional fields gracefully', () => {
    const minimal: Patient = {
      resourceType: 'Patient',
      id: 'pat-minimal'
    };

    const result = parseFhirProfile(minimal);

    expect(result.phone).toBe('');
    expect(result.email).toBe('');
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
    expect(result.addresses).toEqual([]);
    expect(result.city).toBe('');
    expect(result.userId).toBe('');
  });

  it('handles missing name.given as empty string', () => {
    const patient: Patient = {
      resourceType: 'Patient',
      id: 'pat-no-given',
      name: [{ family: 'Smith' }]
    };

    const result = parseFhirProfile(patient);

    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('Smith');
  });
});
