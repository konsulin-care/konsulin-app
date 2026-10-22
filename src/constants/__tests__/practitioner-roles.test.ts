import { describe, expect, it } from 'vitest';
import {
  ClinicAdminRoleCode,
  LoginIdentifierSystem,
  ResearcherRoleCode
} from '../practitioner-roles';

describe('practitioner-role constants', () => {
  it('defines the Clinic Admin role code from the SNOMED practitioner-role value set', () => {
    expect(ClinicAdminRoleCode).toEqual({
      // eslint-disable-next-line unicorn/prefer-https
      system: 'http://snomed.info/sct',
      code: '224608005'
    });
  });

  it('defines the Researcher role code from the HL7 practitioner-role value set', () => {
    expect(ResearcherRoleCode).toEqual({
      // eslint-disable-next-line unicorn/prefer-https
      system: 'http://terminology.hl7.org/CodeSystem/practitioner-role',
      code: 'researcher'
    });
  });

  it('defines the login identifier system used by the bundle and chain params', () => {
    expect(LoginIdentifierSystem).toBe('https://login.konsulin.care/userid');
  });
});
