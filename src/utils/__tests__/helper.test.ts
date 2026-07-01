import type { Patient } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { generateAvatarPlaceholder, parseFhirProfile } from '../helper';

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
      state: 'DKI Jakarta',
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

describe('generateAvatarPlaceholder', () => {
  it('returns teal #13c2c2 as backgroundColor when id is provided', () => {
    const result = generateAvatarPlaceholder({
      id: 'practitioner-123',
      name: 'Dr. Smith',
      email: 'smith@clinic.com'
    });

    expect(result.backgroundColor).toBe('#13c2c2');
    expect(result.seed).toBe('practitioner-123');
    expect(result.initials).toBe('DS');
  });

  it('returns teal #13c2c2 as backgroundColor when only email is provided', () => {
    const result = generateAvatarPlaceholder({
      email: 'jane@clinic.com'
    });

    expect(result.backgroundColor).toBe('#13c2c2');
    expect(result.seed).toBe('jane@clinic.com');
    expect(result.initials).toBe('JA');
  });

  it('returns teal #13c2c2 as backgroundColor when only userId is provided', () => {
    const result = generateAvatarPlaceholder({
      userId: 'user-xyz'
    });

    expect(result.backgroundColor).toBe('#13c2c2');
    expect(result.seed).toBe('user-xyz');
    expect(result.initials).toBe('US');
  });

  it('returns null backgroundColor when no seed is available', () => {
    const result = generateAvatarPlaceholder({});

    expect(result.backgroundColor).toBeNull();
    expect(result.seed).toBe('');
    expect(result.initials).toBeNull();
  });

  it('extracts initials from full name', () => {
    const result = generateAvatarPlaceholder({
      id: '123',
      name: 'John Doe'
    });

    expect(result.initials).toBe('JD');
  });

  it('extracts initials from single name', () => {
    const result = generateAvatarPlaceholder({
      id: '456',
      name: 'John'
    });

    expect(result.initials).toBe('JO');
  });

  it('extracts initials from email local part', () => {
    const result = generateAvatarPlaceholder({
      id: '789',
      email: 'alice@example.com'
    });

    expect(result.initials).toBe('AL');
  });

  it('prefers id over other fields for seed', () => {
    const result = generateAvatarPlaceholder({
      id: 'preferred-id',
      name: 'Some Name',
      email: 'some@email.com',
      userId: 'some-user'
    });

    expect(result.seed).toBe('preferred-id');
  });

  it('handles name that is just a dash', () => {
    const result = generateAvatarPlaceholder({
      id: 'id-1',
      name: '-',
      email: 'test@test.com'
    });

    expect(result.initials).toBe('TE');
    expect(result.seed).toBe('id-1');
  });
});

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
    expect(result.province).toBe('DKI Jakarta');
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
    expect(result.province).toBe('');
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
