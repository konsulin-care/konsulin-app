import { Roles } from '@/constants/roles';
import {
  Building2,
  FlaskConical,
  Stethoscope,
  User,
  UserRound,
  type LucideIcon
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  [Roles.Patient]: 'Patient',
  [Roles.Practitioner]: 'Practitioner',
  [Roles.ClinicAdmin]: Roles.ClinicAdmin,
  [Roles.Researcher]: Roles.Researcher
};

/** Display label for an app role. */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}

const ROLE_ICONS: Record<string, LucideIcon> = {
  [Roles.Patient]: UserRound,
  [Roles.Practitioner]: Stethoscope,
  [Roles.ClinicAdmin]: Building2,
  [Roles.Researcher]: FlaskConical
};

/**
 * Icon shown next to a role in the role-switch dropdown. Falls back to a
 * generic user icon for unknown roles.
 *
 * @param role - The canonical app role name.
 * @returns The lucide icon component for that role.
 */
export function roleIcon(role: string): LucideIcon {
  return ROLE_ICONS[role] ?? User;
}
