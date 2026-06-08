import { Roles } from '@/constants/roles';

const ROLE_TO_FHIR_RESOURCE: Record<string, string> = {
  [Roles.Patient]: 'Patient',
  [Roles.Practitioner]: 'Practitioner',
  [Roles.ClinicAdmin]: 'Person'
};

/**
 *
 */
export function roleToFhirResource(role: string): string {
  return ROLE_TO_FHIR_RESOURCE[role] || 'Patient';
}
