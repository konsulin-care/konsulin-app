import { getAPI } from '@/services/api';
import { mergeNames } from '@/utils/helper';
import { roleToFhirResource } from '@/utils/role-fhir';
import type { Bundle, Patient, Person, Practitioner } from 'fhir/r4';

/** A resolved role profile: display name, photo URL and full resource. */
export interface RoleProfile {
  name: string;
  photoUrl: string;
  /** The complete FHIR resource backing this role. */
  resource: ProfileResource;
}

/** Full FHIR resource backing any role's profile. */
export type ProfileResource = Patient | Practitioner | Person;

/** Result of the single batch fetch for the active profile + role switcher. */
export interface UserProfilesBundleResult {
  /** Full resource of the active role (no `_elements` projection). */
  activeProfile: ProfileResource | null;
  /** Minimal display summary per role, or null when missing/failed. */
  roleProfiles: Record<string, RoleProfile | null>;
}

/**
 * Extract the profile summary from a searchset Bundle response.
 *
 * @param bundle - The FHIR searchset returned for one role identifier query.
 * @returns The profile summary, or null when the resource is missing or
 *   has no usable name (caller falls back to placeholder initials).
 */
function parseRoleProfile(bundle: Bundle): RoleProfile | null {
  const resource = bundle?.entry?.[0]?.resource as ProfileResource | undefined;
  if (!resource) return null;
  const name = mergeNames(resource.name ?? []);
  if (!name || name === '-') return null;
  return {
    name,
    photoUrl:
      resource.resourceType === 'Person'
        ? (resource.photo?.url ?? '')
        : (resource.photo?.[0]?.url ?? ''),
    resource
  };
}

/**
 * Fetch the active role's full profile plus full resources for every role
 * of a user in a single FHIR batch request.
 *
 * Builds one `type: 'batch'` bundle with one GET entry per role, each
 * searching by the login identifier. Every entry requests the complete
 * resource — the returned resources are cached and reused by the profile
 * page and the multi-role save flow, so no per-visit fetches are needed.
 * The response is a `batch-response` bundle parsed by entry index, so a
 * missing or failed entry for one role never blocks the others.
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
    entry: roleList.map(role => ({
      request: {
        method: 'GET',
        url: `/${roleToFhirResource(role)}?identifier=https://login.konsulin.care/userid|${encodeURIComponent(userId)}`
      }
    }))
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
    const resource = searchset?.entry?.[0]?.resource as
      | ProfileResource
      | undefined;
    if (role === activeRole) {
      activeProfile = resource ?? null;
    }
    roleProfiles[role] = searchset ? parseRoleProfile(searchset) : null;
  });

  return { activeProfile, roleProfiles };
}
