import { Roles } from '@/constants/roles';
import { describe, expect, it } from 'vitest';
import { roleToFhirResource } from '../role-fhir';

describe('roleToFhirResource', () => {
  it('maps Patient to the Patient resource', () => {
    expect(roleToFhirResource(Roles.Patient)).toBe('Patient');
  });

  it('maps Practitioner to the Practitioner resource', () => {
    expect(roleToFhirResource(Roles.Practitioner)).toBe('Practitioner');
  });

  it('maps Clinic Admin to the Practitioner resource', () => {
    expect(roleToFhirResource(Roles.ClinicAdmin)).toBe('Practitioner');
  });

  it('maps Researcher to the Practitioner resource', () => {
    expect(roleToFhirResource(Roles.Researcher)).toBe('Practitioner');
  });

  it('defaults unknown roles to the Patient resource', () => {
    expect(roleToFhirResource('Unknown Role')).toBe('Patient');
  });
});
