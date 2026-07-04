import type { Bundle, Patient } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { generateAvatarPlaceholder, parseFhirProfile, parseMergedSessions } from '../helper';

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

describe('parseMergedSessions', () => {
  it('extracts location and healthcare service from bundle', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Appointment',
            id: 'appt-1',
            start: '2026-07-04T09:00:00+07:00',
            slot: [{ reference: 'Slot/slot-1' }],
            participant: [
              {
                actor: { reference: 'PractitionerRole/role-1' },
                status: 'accepted'
              },
              {
                actor: { reference: 'Patient/pat-1' },
                status: 'accepted'
              },
              {
                actor: { reference: 'Location/loc-1' },
                status: 'accepted'
              },
              {
                actor: { reference: 'HealthcareService/hs-1' },
                status: 'accepted'
              }
            ]
          }
        },
        {
          resource: {
            resourceType: 'Slot',
            id: 'slot-1',
            start: '2026-07-04T09:00:00+07:00',
            end: '2026-07-04T09:30:00+07:00',
            status: 'free'
          }
        },
        {
          resource: {
            resourceType: 'Patient',
            id: 'pat-1',
            name: [{ given: ['John'], family: 'Doe' }],
            telecom: [{ system: 'email', value: 'john@test.com' }]
          }
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-1',
            name: 'Clinic A'
          }
        },
        {
          resource: {
            resourceType: 'HealthcareService',
            id: 'hs-1',
            name: 'General Consultation'
          }
        }
      ]
    };

    const result = parseMergedSessions(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].locationId).toBe('loc-1');
    expect(result[0].locationName).toBe('Clinic A');
    expect(result[0].healthcareServiceName).toBe('General Consultation');
  });

  it('handles bundle with no location or healthcare service', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Appointment',
            id: 'appt-2',
            start: '2026-07-04T10:00:00+07:00',
            slot: [{ reference: 'Slot/slot-2' }],
            participant: [
              {
                actor: { reference: 'Patient/pat-2' },
                status: 'accepted'
              }
            ]
          }
        },
        {
          resource: {
            resourceType: 'Slot',
            id: 'slot-2',
            start: '2026-07-04T10:00:00+07:00',
            end: '2026-07-04T10:30:00+07:00',
            status: 'free'
          }
        },
        {
          resource: {
            resourceType: 'Patient',
            id: 'pat-2',
            name: [{ given: ['Jane'], family: 'Smith' }],
            telecom: [{ system: 'email', value: 'jane@test.com' }]
          }
        }
      ]
    };

    const result = parseMergedSessions(bundle);
    expect(result).toHaveLength(1);
    expect(result[0].locationId).toBeUndefined();
    expect(result[0].locationName).toBeUndefined();
    expect(result[0].healthcareServiceName).toBeUndefined();
  });

  it('extracts location name from alias when name is absent', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Appointment',
            id: 'appt-3',
            start: '2026-07-04T11:00:00+07:00',
            slot: [{ reference: 'Slot/slot-3' }],
            participant: [
              {
                actor: { reference: 'Patient/pat-3' },
                status: 'accepted'
              },
              {
                actor: { reference: 'Location/loc-3' },
                status: 'accepted'
              }
            ]
          }
        },
        {
          resource: {
            resourceType: 'Slot',
            id: 'slot-3',
            start: '2026-07-04T11:00:00+07:00',
            end: '2026-07-04T11:30:00+07:00',
            status: 'free'
          }
        },
        {
          resource: {
            resourceType: 'Patient',
            id: 'pat-3',
            name: [{ given: ['Bob'] }],
            telecom: [{ system: 'email', value: 'bob@test.com' }]
          }
        },
        {
          resource: {
            resourceType: 'Location',
            id: 'loc-3',
            alias: ['Clinic B']
          }
        }
      ]
    };

    const result = parseMergedSessions(bundle);
    expect(result[0].locationId).toBe('loc-3');
    expect(result[0].locationName).toBe('Clinic B');
  });

  it('sorts sessions by slotStart ascending', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Appointment',
            id: 'appt-early',
            start: '2026-07-04T08:00:00+07:00',
            slot: [{ reference: 'Slot/slot-early' }],
            participant: [
              { actor: { reference: 'Patient/pat-1' }, status: 'accepted' }
            ]
          }
        },
        {
          resource: {
            resourceType: 'Appointment',
            id: 'appt-late',
            start: '2026-07-04T10:00:00+07:00',
            slot: [{ reference: 'Slot/slot-late' }],
            participant: [
              { actor: { reference: 'Patient/pat-2' }, status: 'accepted' }
            ]
          }
        },
        {
          resource: {
            resourceType: 'Slot',
            id: 'slot-early',
            start: '2026-07-04T08:00:00+07:00',
            end: '2026-07-04T08:30:00+07:00',
            status: 'free'
          }
        },
        {
          resource: {
            resourceType: 'Slot',
            id: 'slot-late',
            start: '2026-07-04T10:00:00+07:00',
            end: '2026-07-04T10:30:00+07:00',
            status: 'free'
          }
        },
        {
          resource: {
            resourceType: 'Patient',
            id: 'pat-1',
            name: [{ given: ['Alice'] }],
            telecom: [{ system: 'email', value: 'a@t.com' }]
          }
        },
        {
          resource: {
            resourceType: 'Patient',
            id: 'pat-2',
            name: [{ given: ['Bob'] }],
            telecom: [{ system: 'email', value: 'b@t.com' }]
          }
        }
      ]
    };

    const result = parseMergedSessions(bundle);
    expect(result).toHaveLength(2);
    expect(result[0].appointmentId).toBe('appt-early');
    expect(result[1].appointmentId).toBe('appt-late');
  });

  it('returns empty array for empty bundle', () => {
    const bundle: Bundle = { resourceType: 'Bundle', entry: [] };
    const result = parseMergedSessions(bundle);
    expect(result).toEqual([]);
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
