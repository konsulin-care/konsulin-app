/* eslint-disable unicorn/no-useless-switch-case */
import { Roles } from '@/constants/roles';

export type FhirResourceType = 'Patient' | 'Practitioner' | 'Person';

/**
 * Map an app role name to the FHIR resource that stores its profile.
 *
 * @param role - The canonical app role name.
 * @returns The FHIR resource type backing that role's profile.
 */
export function roleToFhirResource(role: string): FhirResourceType {
  switch (role) {
    case Roles.Practitioner: {
      return 'Practitioner';
    }
    case Roles.ClinicAdmin: {
      return 'Person';
    }
    case Roles.Researcher: {
      return 'Person';
    }
    case Roles.Patient:
    default: {
      return 'Patient';
    }
  }
}
