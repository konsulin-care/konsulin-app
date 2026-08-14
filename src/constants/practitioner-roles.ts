/**
 * PractitionerRole coding contract for admin/researcher roles, plus the
 * login identifier system shared by the profile bundle and its chain params.
 *
 * Clinic Admin and Researcher are backed by a Practitioner resource carrying
 * a coded PractitionerRole. The codes come from the FHIR R4
 * practitioner-role value set: HL7 `researcher` and SNOMED `224608005`
 * (Administrative healthcare staff).
 */
export const ClinicAdminRoleCode = {
  // FHIR canonical system URLs use http:// — never fetched, locator only
  // eslint-disable-next-line unicorn/prefer-https
  system: 'http://snomed.info/sct',
  code: '224608005'
} as const;

export const ResearcherRoleCode = {
  // eslint-disable-next-line unicorn/prefer-https
  system: 'http://terminology.hl7.org/CodeSystem/practitioner-role',
  code: 'researcher'
} as const;

/** SuperTokens user ID identifier system used on Patient/Practitioner. */
export const LoginIdentifierSystem = 'https://login.konsulin.care/userid';
