/**
 * PractitionerRole coding contract for admin/researcher roles, plus the
 * login identifier system shared by the profile bundle and its chain params.
 *
 * Clinic Admin and Researcher are backed by a Practitioner resource carrying
 * a coded PractitionerRole. The codes come from the FHIR R4
 * practitioner-role value set: HL7 `researcher` and SNOMED `224608005`
 * (Administrative healthcare staff). System URLs live in `FhirSystems`;
 * they are canonical locators, never fetched.
 */
import { FhirSystems } from '@/utils/fhir/extensions';

export const ClinicAdminRoleCode = {
  system: FhirSystems.snomedSct,
  code: '224608005'
} as const;

export const ResearcherRoleCode = {
  system: FhirSystems.practitionerRole,
  code: 'researcher'
} as const;

/** SuperTokens user ID identifier system used on Patient/Practitioner. */
export const LoginIdentifierSystem = 'https://login.konsulin.care/userid';
