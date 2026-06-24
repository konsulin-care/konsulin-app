/* eslint-disable unicorn/no-useless-switch-case */
import { Roles } from '@/constants/roles';

/**
 *
 */
export function roleToFhirResource(role: string): string {
  switch (role) {
    case Roles.Practitioner: {
      return 'Practitioner';
    }
    case Roles.ClinicAdmin: {
      return 'Person';
    }
    case Roles.Patient:
    default: {
      return 'Patient';
    }
  }
}
