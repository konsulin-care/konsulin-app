/* eslint-disable unicorn/no-useless-switch-case */
import { Roles } from '@/constants/roles';

export type FhirResourceType = 'Patient' | 'Practitioner';

/**
 * Map an app role name to the FHIR resource that stores its profile.
 *
 * Clinic Admin and Researcher profiles live on the Practitioner resource
 * (role-coded via PractitionerRole), not on a Person resource.
 *
 * @param role - The canonical app role name.
 * @returns The FHIR resource type backing that role's profile.
 */
export function roleToFhirResource(role: string): FhirResourceType {
  switch (role) {
    case Roles.Practitioner:
    case Roles.ClinicAdmin:
    case Roles.Researcher: {
      return 'Practitioner';
    }
    case Roles.Patient:
    default: {
      return 'Patient';
    }
  }
}
