import { Roles } from '@/constants/roles';
import type { UserProfile } from '@/services/api';
import {
  type ProfileResource,
  type RoleProfile
} from '@/services/role-profiles';
import { mergeNames } from '@/utils/helper';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import { hasPendingAssessmentClaimIntent } from '@/utils/redirect-intent';
import { roleToFhirResource } from '@/utils/role-fhir';
import type { IStateUserInfo } from './authTypes';

type UserRole =
  | typeof Roles.Practitioner
  | typeof Roles.ClinicAdmin
  | typeof Roles.Patient;

/**
 * Extract the photo URL from a FHIR profile.
 *
 * @param profile - The FHIR profile (Patient or Practitioner).
 * @returns The photo URL string, or empty string if absent.
 */
export function extractPhotoUrl(profile: ProfileResource | null): string {
  return profile?.photo?.[0]?.url ?? '';
}

/**
 * Build the login payload from the active profile resource.
 *
 * @param userId - The user's ID.
 * @param role - The active role.
 * @param superTokensRoles - Array of SuperTokens roles.
 * @param profile - The FHIR profile resource.
 * @param roleProfiles - Map of role to RoleProfile.
 * @returns IStateUserInfo payload for the auth state.
 */
export function buildLoginPayload(
  userId: string,
  role: UserRole,
  superTokensRoles: string[] | undefined,
  profile: ProfileResource,
  roleProfiles: Record<string, RoleProfile | null>
): IStateUserInfo {
  return {
    userId,
    role_name: role,
    roles: superTokensRoles,
    email: profile.telecom?.find(item => item.system === 'email')?.value,
    profile_picture: extractPhotoUrl(profile),
    fullname: mergeNames(profile.name),
    fhirId: profile.id ?? '',
    organizationId: roleProfiles[role]?.organizationId,
    profile_complete: isProfileCompleteFromFHIR(profile),
    roleProfiles,
    fullProfile: profile,
    cachedAt: Date.now()
  };
}

/**
 * True when every non-null role profile carries its full resource.
 *
 * @param roleProfiles - Map of role to RoleProfile.
 * @returns True if all non-null profiles have a resource.
 */
export function roleProfilesCarryResources(
  roleProfiles: Record<string, RoleProfile | null> | undefined
): boolean {
  if (!roleProfiles) return false;
  return Object.values(roleProfiles).every(
    profile => profile === null || Boolean(profile.resource)
  );
}

/**
 * True when every non-null role profile's resource type matches the role's
 * backing FHIR resource.
 *
 * @param roleProfiles - Map of role to RoleProfile.
 * @returns True if all resource types match.
 */
export function roleProfilesCarryMatchingTypes(
  roleProfiles: Record<string, RoleProfile | null> | undefined
): boolean {
  if (!roleProfiles) return true;
  return Object.entries(roleProfiles).every(([role, profile]) => {
    if (profile === null) return true;
    if (!profile.resource) return false;
    return profile.resource.resourceType === roleToFhirResource(role);
  });
}

/**
 * True when a cached profile can serve the session.
 *
 * @param cached - The cached UserProfile, or null.
 * @param superTokensRoles - Array of SuperTokens roles.
 * @returns True if the cache is usable.
 */
export function isCacheUsable(
  cached: UserProfile | null,
  superTokensRoles: string[] | undefined
): boolean {
  if (!cached) return false;
  if (!cached.fullname && !cached.fhirId) return false;
  const isMultiRole =
    Array.isArray(superTokensRoles) && superTokensRoles.length > 1;
  return (
    roleProfilesCarryMatchingTypes(cached.roleProfiles) &&
    (!isMultiRole || roleProfilesCarryResources(cached.roleProfiles))
  );
}

/**
 * Resolve the active user role from cookie or SuperTokens claims.
 *
 * @param cookieRole - Role from the auth cookie.
 * @param superTokensRoles - Roles from SuperTokens claims.
 * @returns The resolved UserRole.
 */
export function resolveActiveRole(
  cookieRole: string | undefined,
  superTokensRoles: string[] | undefined
): UserRole {
  if (cookieRole) return cookieRole as UserRole;
  if (Array.isArray(superTokensRoles)) {
    if (
      superTokensRoles.includes(Roles.Patient) &&
      hasPendingAssessmentClaimIntent()
    ) {
      return Roles.Patient;
    }
    if (superTokensRoles.includes(Roles.Practitioner))
      return Roles.Practitioner;
    if (superTokensRoles.includes(Roles.ClinicAdmin)) return Roles.ClinicAdmin;
    if (superTokensRoles.includes(Roles.Patient)) return Roles.Patient;
  }
  return Roles.Patient;
}
