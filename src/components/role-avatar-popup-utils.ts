import { AvatarInfo } from '@/components/role-avatar-popup-types';
import { Roles } from '@/constants/roles';
import type { RoleProfile } from '@/services/role-profiles';
import { generateAvatarPlaceholder } from '@/utils/helper';

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

/** Builds AvatarInfo for a fetched role profile (photo + name initials). */
function avatarInfoFromProfile(role: string, profile: RoleProfile): AvatarInfo {
  const placeholder = generateAvatarPlaceholder({
    id: role,
    name: profile.name
  });
  return {
    seed: placeholder.seed,
    initials: placeholder.initials ?? '',
    backgroundColor: placeholder.backgroundColor ?? '',
    photoUrl: profile.photoUrl
  };
}

/** Builds AvatarInfo placeholder (initials only) for a role without a profile. */
export function avatarInfoForRole(role: string): AvatarInfo {
  const displayName = roleLabel(role);
  const placeholder = generateAvatarPlaceholder({
    id: role,
    name: displayName
  });
  return {
    seed: placeholder.seed,
    initials: placeholder.initials ?? '',
    backgroundColor: placeholder.backgroundColor ?? '',
    photoUrl: ''
  };
}

/**
 * Builds the other-role avatar list for the role-switch popup.
 *
 * Excludes the current role and prefers the fetched profile (real photo +
 * name-based initials) over the role placeholder for every other role.
 *
 * @param roles - All roles of the authenticated user.
 * @param currentRole - The active role, excluded from the result.
 * @param profiles - Fetched role profiles keyed by role; null or undefined
 *   entries fall back to placeholder initials.
 * @returns The other-role avatars with their role names.
 */
export function buildOtherRoleAvatars(
  roles: string[],
  currentRole: string | undefined,
  profiles: Record<string, RoleProfile | null> | undefined
): (AvatarInfo & { role: string })[] {
  return roles
    .filter(role => role !== currentRole)
    .map(role => {
      const profile = profiles?.[role];
      return {
        role,
        ...(profile
          ? avatarInfoFromProfile(role, profile)
          : avatarInfoForRole(role))
      };
    });
}
