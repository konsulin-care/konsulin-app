import { Roles } from '@/constants/roles';

const ROLE_LABELS: Record<string, string> = {
  [Roles.Patient]: 'Patient',
  [Roles.Practitioner]: 'Practitioner',
  [Roles.ClinicAdmin]: Roles.ClinicAdmin
};

/**
 *
 */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}
