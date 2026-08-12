import type { Patient, Person, Practitioner } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { isProfileCompleteFromFHIR } from '../profileCompleteness';

const completePatient: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  active: true,
  name: [{ use: 'official', given: ['John'], family: 'Doe' }],
  gender: 'male',
  birthDate: '1990-03-12',
  communication: [{ language: { coding: [{ code: 'id' }] } }]
};

describe('isProfileCompleteFromFHIR', () => {
  it('is complete when name, gender, birthDate and language are present', () => {
    expect(isProfileCompleteFromFHIR(completePatient)).toBe(true);
  });

  it('is incomplete when name is missing', () => {
    const profile: Patient = {
      ...completePatient,
      name: []
    };
    expect(isProfileCompleteFromFHIR(profile)).toBe(false);
  });

  it('is incomplete when gender is missing', () => {
    const profile: Patient = {
      ...completePatient,
      gender: undefined
    };
    expect(isProfileCompleteFromFHIR(profile)).toBe(false);
  });

  it('is incomplete when birthDate is missing', () => {
    const profile: Patient = {
      ...completePatient,
      birthDate: undefined
    };
    expect(isProfileCompleteFromFHIR(profile)).toBe(false);
  });

  it('is incomplete for Patient/Practitioner without a language', () => {
    const profile: Patient = {
      ...completePatient,
      communication: []
    };
    expect(isProfileCompleteFromFHIR(profile)).toBe(false);
  });

  it('is complete for Practitioner with direct CodeableConcept communication', () => {
    const practitioner: Practitioner = {
      resourceType: 'Practitioner',
      id: 'pra-1',
      active: true,
      name: [{ use: 'official', given: ['Jane'], family: 'Smith' }],
      gender: 'female',
      birthDate: '1985-07-01',
      communication: [{ coding: [{ code: 'en' }] }]
    };
    expect(isProfileCompleteFromFHIR(practitioner)).toBe(true);
  });

  it('never fails on language for Person-based profiles', () => {
    const person: Person = {
      resourceType: 'Person',
      id: 'clinic-1',
      active: true,
      name: [{ use: 'official', given: ['Alex'], family: 'Brown' }],
      gender: 'other',
      birthDate: '1978-11-20'
    };
    expect(isProfileCompleteFromFHIR(person)).toBe(true);
  });
});
