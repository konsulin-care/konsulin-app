import type { Patient, Person, Practitioner } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  mergeAddress,
  mergeContact,
  mergePersonalInfo,
  mergePersonalInfoSync,
  type AddressValues
} from '../section-merge';

const patientFixture: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  active: true,
  name: [{ use: 'official', given: ['John'], family: 'Doe' }]
};

const personFixture: Person = {
  resourceType: 'Person',
  id: 'clinic-1',
  active: true,
  name: [{ use: 'official', given: ['Alex'], family: 'Brown' }]
};

describe('mergePersonalInfo', () => {
  it('merges gender and birthDate into the resource', () => {
    const merged = mergePersonalInfo(patientFixture, {
      gender: 'male',
      birthDate: '1990-03-12'
    });
    expect(merged.gender).toBe('male');
    expect(merged.birthDate).toBe('1990-03-12');
  });

  it('writes a Patient-style communication language', () => {
    const merged = mergePersonalInfo(patientFixture, {
      gender: 'male',
      birthDate: '1990-03-12',
      languageCode: 'id',
      languageLabel: 'Indonesian'
    });
    expect((merged as Patient).communication).toEqual([
      {
        language: {
          coding: [
            { system: 'urn:ietf:bcp:47', code: 'id', display: 'Indonesian' }
          ]
        }
      }
    ]);
  });

  it('writes a Practitioner-style direct CodeableConcept language', () => {
    const practitioner: Practitioner = {
      ...patientFixture,
      resourceType: 'Practitioner'
    };
    const merged = mergePersonalInfo(practitioner, {
      gender: 'female',
      birthDate: '1985-07-01',
      languageCode: 'en',
      languageLabel: 'English'
    });
    expect((merged as Practitioner).communication).toEqual([
      {
        coding: [{ system: 'urn:ietf:bcp:47', code: 'en', display: 'English' }]
      }
    ]);
  });

  it('never writes a language for Person-based resources', () => {
    const merged = mergePersonalInfo(personFixture, {
      gender: 'other',
      birthDate: '1978-11-20',
      languageCode: 'id',
      languageLabel: 'Indonesian'
    });
    expect('communication' in merged).toBe(false);
    expect(merged.gender).toBe('other');
  });
});

describe('mergePersonalInfoSync', () => {
  it('writes gender and birthDate only (no language) for Patient', () => {
    const merged = mergePersonalInfoSync(patientFixture, {
      gender: 'male',
      birthDate: '1990-03-12',
      languageCode: 'id',
      languageLabel: 'Indonesian'
    });
    expect(merged.gender).toBe('male');
    expect(merged.birthDate).toBe('1990-03-12');
    expect('communication' in merged).toBe(false);
  });

  it('writes gender and birthDate only for Practitioner', () => {
    const practitioner: Practitioner = {
      ...patientFixture,
      resourceType: 'Practitioner'
    };
    const merged = mergePersonalInfoSync(practitioner, {
      gender: 'female',
      birthDate: '1985-07-01',
      languageCode: 'en',
      languageLabel: 'English'
    });
    expect(merged.gender).toBe('female');
    expect('communication' in merged).toBe(false);
  });

  it('writes gender and birthDate only for Person', () => {
    const merged = mergePersonalInfoSync(personFixture, {
      gender: 'other',
      birthDate: '1978-11-20',
      languageCode: 'id',
      languageLabel: 'Indonesian'
    });
    expect(merged.gender).toBe('other');
    expect(merged.birthDate).toBe('1978-11-20');
    expect('communication' in merged).toBe(false);
  });
});

describe('mergeContact', () => {
  it('builds a telecom array from email and phone', () => {
    const merged = mergeContact(patientFixture, {
      email: 'john@konsulin.care',
      phone: '+628123456789'
    });
    expect(merged.telecom).toEqual([
      { system: 'email', use: 'home', value: 'john@konsulin.care' },
      { system: 'phone', use: 'mobile', value: '+628123456789' }
    ]);
  });

  it('omits empty contact channels', () => {
    const merged = mergeContact(personFixture, {
      email: '',
      phone: '  '
    });
    expect(merged.telecom).toEqual([]);
  });
});

describe('mergeAddress', () => {
  it('builds a home address with country ID', () => {
    const values: AddressValues = {
      line: ['Jl. Merdeka 12', 'Blok C'],
      district: 'Kebayoran Baru',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12120'
    };
    const merged = mergeAddress(patientFixture, values);
    expect(merged.address).toEqual([
      {
        use: 'home',
        type: 'physical',
        line: ['Jl. Merdeka 12', 'Blok C'],
        district: 'Kebayoran Baru',
        city: 'Jakarta Selatan',
        state: 'DKI Jakarta',
        postalCode: '12120',
        country: 'ID'
      }
    ]);
  });
});
