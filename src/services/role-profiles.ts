import {
  ClinicAdminRoleCode,
  LoginIdentifierSystem,
  ResearcherRoleCode
} from '@/constants/practitioner-roles';
import { Roles } from '@/constants/roles';
import { getAPI } from '@/services/api';
import { mergeNames } from '@/utils/helper';
import { roleToFhirResource } from '@/utils/role-fhir';
import type { Bundle, Patient, Practitioner, PractitionerRole } from 'fhir/r4';

/** A resolved role profile: display name, photo URL, org and full resource. */
export interface RoleProfile {
  name: string;
  photoUrl: string;
  /** Organization id resolved from the role's PractitionerRole, when set. */
  organizationId?: string;
  /** The complete FHIR resource backing this role. */
  resource: ProfileResource;
}

/** Full FHIR resource backing any role's profile. */
export type ProfileResource = Patient | Practitioner;

/** Result of the single batch fetch for the active profile + role switcher. */
export interface UserProfilesBundleResult {
  /** Full resource of the active role (no `_elements` projection). */
  activeProfile: ProfileResource | null;
  /** Minimal display summary per role, or null when missing/failed. */
  roleProfiles: Record<string, RoleProfile | null>;
}

/** Role-coded profiles are backed by a PractitionerRole search entry. */
const ROLE_CODES: Record<string, { system: string; code: string }> = {
  [Roles.ClinicAdmin]: ClinicAdminRoleCode,
  [Roles.Researcher]: ResearcherRoleCode
};

/**
 * Build the PractitionerRole search URL for a role-coded profile
 * (Clinic Admin / Researcher).
 *
 * The verified query starts on PractitionerRole so the org lives on the
 * match entry. The Practitioner is returned via a forward include; the user
 * is scoped by the unqualified chain `practitioner.identifier` — the
 * qualified form `PractitionerRole:practitioner:identifier` is silently
 * dropped by Blaze, so it must never be used.
 *
 * @param roleCode - The role coding (system|code) to filter on.
 * @param userId - The SuperTokens user ID used as the identifier value.
 * @returns The FHIR search URL for the role's profile bundle entry.
 */
function buildPractitionerRoleUrl(
  roleCode: { system: string; code: string },
  userId: string
): string {
  const params = [
    `role=${roleCode.system}|${roleCode.code}`,
    '_include=PractitionerRole:practitioner',
    `practitioner.identifier=${LoginIdentifierSystem}|${encodeURIComponent(userId)}`,
    '_elements=organization'
  ];
  return `/PractitionerRole?${params.join('&')}`;
}

/**
 * Build the identifier search URL for a plain profile (Patient/Practitioner).
 *
 * @param resourceType - The FHIR resource type to search.
 * @param userId - The SuperTokens user ID used as the identifier value.
 * @returns The FHIR search URL for the role's profile bundle entry.
 */
function buildIdentifierUrl(resourceType: string, userId: string): string {
  return `/${resourceType}?identifier=${LoginIdentifierSystem}|${encodeURIComponent(userId)}`;
}

/**
 * Extract the organization id from a PractitionerRole match entry,
 * stripping the `Organization/` reference prefix when present.
 *
 * @param role - The PractitionerRole resource.
 * @returns The organization id, or undefined when unset.
 */
function extractOrganizationId(role: PractitionerRole): string | undefined {
  const ref = role.organization?.reference;
  if (!ref) return undefined;
  return ref.replace(/^Organization\//, '') || undefined;
}

/**
 * Parse a role-coded searchset (Clinic Admin / Researcher) into a profile.
 *
 * The verified PractitionerRole query returns the role as the match entry
 * (source of the org) and the full Practitioner as the include entry
 * (source of the profile). A missing match or Practitioner yields null.
 *
 * @param searchset - The searchset returned for the role query.
 * @returns The profile summary, or null when the role has no resource.
 */
function parseRoleCodedProfile(searchset: Bundle): RoleProfile | null {
  const match = searchset?.entry?.find(
    entry => entry.resource?.resourceType === 'PractitionerRole'
  );
  const practitioner = searchset?.entry?.find(
    entry => entry.resource?.resourceType === 'Practitioner'
  )?.resource as Practitioner | undefined;
  if (!match?.resource || !practitioner) return null;
  const organizationId = extractOrganizationId(
    match.resource as PractitionerRole
  );
  return {
    name: mergeNames(practitioner.name ?? []),
    photoUrl: practitioner.photo?.[0]?.url ?? '',
    ...(organizationId ? { organizationId } : {}),
    resource: practitioner
  };
}

/**
 * Parse a plain searchset (Patient/Practitioner) into a profile.
 *
 * A found resource is always cached — even an unnamed one (its name falls
 * back to '-') — so empty profiles stay part of the multi-role sync instead
 * of being silently dropped. Only a missing resource yields null.
 *
 * @param searchset - The searchset returned for the role query.
 * @returns The profile summary, or null when the resource is missing.
 */
function parsePlainProfile(searchset: Bundle): RoleProfile | null {
  const resource = searchset?.entry?.[0]?.resource as
    | ProfileResource
    | undefined;
  if (!resource) return null;
  return {
    name: mergeNames(resource.name ?? []),
    photoUrl: resource.photo?.[0]?.url ?? '',
    resource
  };
}

/**
 * Extract the profile summary from a searchset Bundle response.
 *
 * Role-coded profiles (Clinic Admin / Researcher) come from the verified
 * PractitionerRole query; plain profiles keep the legacy entry[0] shape.
 *
 * @param searchset - The FHIR searchset returned for one role query.
 * @param role - The role name this searchset was fetched for.
 * @returns The profile summary, or null when the role has no resource.
 */
function parseRoleProfile(searchset: Bundle, role: string): RoleProfile | null {
  const isRoleCoded = role === Roles.ClinicAdmin || role === Roles.Researcher;
  return isRoleCoded
    ? parseRoleCodedProfile(searchset)
    : parsePlainProfile(searchset);
}

/**
 * Fetch the active role's full profile plus full resources for every role
 * of a user in a single FHIR batch request.
 *
 * Builds one `type: 'batch'` bundle with one GET entry per role. Clinic
 * Admin and Researcher use the verified PractitionerRole query (role code +
 * practitioner include + identifier chain + `_elements=organization`) so the
 * resolved organization rides on the match entry; Patient and Practitioner
 * search by the login identifier as before. Every entry returns the complete
 * profile resource — the returned resources are cached and reused by the
 * profile page and the multi-role save flow, so no per-visit fetches are
 * needed. The response is a `batch-response` bundle parsed by entry index,
 * so a missing or failed entry for one role never blocks the others.
 *
 * @param userId - The SuperTokens user ID used as the FHIR identifier value.
 * @param roles - The role names to fetch profiles for.
 * @param activeRole - The active role. Appended to the bundle as a full
 *   entry when missing from `roles`.
 * @returns The full active profile resource and the per-role profile map.
 */
export async function fetchUserProfilesBundle(
  userId: string,
  roles: string[],
  activeRole: string
): Promise<UserProfilesBundleResult> {
  const roleList = roles.includes(activeRole) ? roles : [...roles, activeRole];

  const bundle: Bundle = {
    resourceType: 'Bundle',
    type: 'batch',
    entry: roleList.map(role => {
      const roleCode = ROLE_CODES[role];
      const url = roleCode
        ? buildPractitionerRoleUrl(roleCode, userId)
        : buildIdentifierUrl(roleToFhirResource(role), userId);
      return {
        request: {
          method: 'GET',
          url
        }
      };
    })
  };

  const API = await getAPI();
  const response = await API.post<Bundle>('/fhir', bundle);
  const responseEntries = response.data.entry ?? [];

  let activeProfile: ProfileResource | null = null;
  const roleProfiles: Record<string, RoleProfile | null> = {};

  roleList.forEach((role, index) => {
    // For a search entry in a batch-response bundle the searchset is the
    // entry's `resource`; `response` only carries status/outcome.
    const searchset = responseEntries[index]?.resource as Bundle | undefined;
    const profile = searchset ? parseRoleProfile(searchset, role) : null;
    if (role === activeRole) {
      activeProfile = profile?.resource ?? null;
    }
    roleProfiles[role] = profile;
  });

  return { activeProfile, roleProfiles };
}
