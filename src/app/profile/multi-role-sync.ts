import type { IStateUserInfo } from '@/context/auth/authTypes';
import type { ProfileResource, RoleProfile } from '@/services/role-profiles';
import { mergeNames } from '@/utils/helper';
import type { Bundle } from 'fhir/r4';
import { getRoleValue, setRoleValue } from './role-map';

/**
 * Build the FHIR key identifying a resource regardless of which role
 * cached it. Several roles (Practitioner, Clinic Admin, Researcher) live on
 * the same Practitioner resource, so role copies share one key.
 *
 * @param resource - The FHIR resource to key.
 * @returns The `resourceType/id` key.
 */
export function resourceKey(resource: ProfileResource): string {
  return `${resource.resourceType}/${resource.id}`;
}

/**
 * Latest `meta.lastUpdated` timestamp, treating a missing value as oldest.
 *
 * @param resource - The FHIR resource to read.
 * @returns The epoch-ms timestamp, or 0 when unset or unparsable.
 */
function lastUpdatedTime(resource: ProfileResource): number {
  const value = resource.meta?.lastUpdated;
  const time = value ? Date.parse(value) : 0;
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Decide whether a candidate copy should replace the current one for the
 * same resource. The `preferred` copy (the active role's) always wins;
 * otherwise the most recent `lastUpdated` wins, keeping the first
 * occurrence on ties.
 *
 * @param current - The currently kept copy.
 * @param candidate - The copy competing against it.
 * @param preferred - The active role's copy, when provided.
 * @returns True when the candidate should replace the current copy.
 */
function isPreferredOver(
  current: ProfileResource,
  candidate: ProfileResource,
  preferred?: ProfileResource
): boolean {
  if (preferred) {
    if (candidate === preferred) return true;
    if (current === preferred) return false;
  }
  return lastUpdatedTime(candidate) > lastUpdatedTime(current);
}

/**
 * Deduplicate profile resources by `resourceType/id`, keeping one copy per
 * FHIR resource. Role copies that share one resource (Practitioner, Clinic
 * Admin, Researcher → same Practitioner) collapse into a single entry so
 * the save transaction never PUTs the same resource twice.
 *
 * @param resources - The role resources to deduplicate.
 * @param preferred - The active role's copy to prefer on duplicates.
 * @returns One resource per distinct FHIR resource.
 */
export function dedupeProfileResources(
  resources: ProfileResource[],
  preferred?: ProfileResource
): ProfileResource[] {
  const seen = new Map<string, ProfileResource>();
  for (const resource of resources) {
    const key = resourceKey(resource);
    const current = seen.get(key);
    if (!current || isPreferredOver(current, resource, preferred)) {
      seen.set(key, resource);
    }
  }
  return [...seen.values()];
}

/**
 * Resolve the roles to sync, falling back to the active role alone.
 *
 * @param userInfo - The auth user info (may be undefined).
 * @returns The role names to consider for a profile save.
 */
export function resolveRoles(userInfo: IStateUserInfo | undefined): string[] {
  if (userInfo?.roles && userInfo.roles.length > 0) return userInfo.roles;
  if (userInfo?.role_name) return [userInfo.role_name];
  return [];
}

/**
 * Canonicalize role entries that share one FHIR resource so no role holds
 * a stale divergent copy. Every role key keeps its entry; roles pointing at
 * the same resource (Practitioner, Clinic Admin, Researcher → the same
 * Practitioner) resolve to a single object — the active role's copy first,
 * else the most recent `lastUpdated`, else the first occurrence.
 *
 * @param resources - The cached resources keyed by role.
 * @param activeRole - The active role name, whose copy is preferred.
 * @returns The canonicalized resources keyed by role.
 */
export function canonicalizeSharedResources(
  resources: Record<string, ProfileResource>,
  activeRole: string
): Record<string, ProfileResource> {
  const groups = new Map<
    string,
    Array<{ role: string; resource: ProfileResource }>
  >();
  for (const [role, resource] of Object.entries(resources)) {
    const key = resourceKey(resource);
    const entries = groups.get(key) ?? [];
    entries.push({ role, resource });
    groups.set(key, entries);
  }
  const canonicalized: Record<string, ProfileResource> = {};
  for (const entries of groups.values()) {
    let winner = entries[0].resource;
    for (const entry of entries) {
      if (entry.role === activeRole) {
        winner = entry.resource;
        break;
      }
      if (lastUpdatedTime(entry.resource) > lastUpdatedTime(winner)) {
        winner = entry.resource;
      }
    }
    for (const entry of entries) {
      setRoleValue(canonicalized, entry.role, winner);
    }
  }
  return canonicalized;
}

/**
 * Collect the cached full resources from the auth state, skipping roles
 * without one. The active role falls back to `fullProfile`. Role copies
 * pointing at the same FHIR resource are canonicalized in place, so the
 * write path and the recache never carry divergent versions of one
 * resource.
 *
 * @param userInfo - The auth user info holding the profile cache.
 * @returns A map of role name to full FHIR resource.
 */
export function collectCachedResources(
  userInfo: IStateUserInfo | undefined
): Record<string, ProfileResource> {
  const resources: Record<string, ProfileResource> = {};
  const activeRole = userInfo?.role_name ?? '';
  for (const role of resolveRoles(userInfo)) {
    const entry = getRoleValue(userInfo?.roleProfiles, role);
    if (entry?.resource) setRoleValue(resources, role, entry.resource);
  }
  if (!getRoleValue(resources, activeRole) && userInfo?.fullProfile) {
    setRoleValue(resources, activeRole, userInfo.fullProfile);
  }
  return canonicalizeSharedResources(resources, activeRole);
}

/**
 * Apply the section merge to every cached resource, using the active merge
 * for the active role and the per-role variant for the others.
 *
 * @param resources - The cached resources keyed by role.
 * @param activeRole - The active role name.
 * @param merge - The full merge for the active role.
 * @param mergeOtherRoles - The sync-safe merge for the other roles.
 * @returns The merged resources keyed by role.
 */
export function mergeResources(
  resources: Record<string, ProfileResource>,
  activeRole: string,
  merge: (latest: ProfileResource) => ProfileResource,
  mergeOtherRoles: (latest: ProfileResource) => ProfileResource
): Record<string, ProfileResource> {
  const merged: Record<string, ProfileResource> = {};
  for (const [role, resource] of Object.entries(resources)) {
    const apply = role === activeRole ? merge : mergeOtherRoles;
    setRoleValue(merged, role, apply(resource));
  }
  return merged;
}

/**
 * Build a FHIR transaction bundle that PUTs every merged role resource,
 * deduplicated by `resourceType/id`. Roles sharing one FHIR resource
 * (Practitioner, Clinic Admin, Researcher → the same Practitioner) would
 * otherwise emit duplicate PUT entries, which Blaze rejects with a
 * `Duplicate resource` 400. The transaction is all-or-nothing: when any
 * entry fails, the FHIR server rejects the whole bundle so no partial
 * profile update is ever persisted.
 *
 * @param resources - The merged resources (active + other roles) to write.
 * @param preferred - The active role's copy, preferred on duplicates.
 * @returns A `type: 'transaction'` bundle with one PUT entry per resource.
 */
export function buildProfileTransactionBundle(
  resources: ProfileResource[],
  preferred?: ProfileResource
): Bundle {
  const unique = dedupeProfileResources(resources, preferred);
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: unique.map(resource => ({
      resource,
      request: {
        method: 'PUT',
        url: `${resource.resourceType}/${resource.id}`
      }
    }))
  };
}

/**
 * Verify every transaction response entry returned a 2xx status.
 *
 * @param bundle - The transaction-response bundle from the FHIR server.
 * @throws When any entry is missing or carries a non-2xx status.
 */
export function assertBundleSuccess(bundle: Bundle): void {
  for (const entry of bundle.entry ?? []) {
    const status = entry.response?.status ?? '';
    if (!/^2\d\d/.test(status)) {
      throw new Error(
        `FHIR transaction entry failed with status '${status || 'missing'}'`
      );
    }
  }
}

/**
 * Rebuild the roleProfiles cache map with the freshly merged resources.
 *
 * Preserves entries for roles that were not part of this save and refreshes
 * name/photoUrl/resource for every merged role, so the profile page and the
 * role switcher read the new values without a refetch.
 *
 * @param merged - The merged resources keyed by role.
 * @param existing - The previous roleProfiles map (may be undefined).
 * @returns The updated roleProfiles map ready for the auth cache.
 */
export function buildUpdatedRoleProfiles(
  merged: Record<string, ProfileResource>,
  existing: Record<string, RoleProfile | null> | undefined
): Record<string, RoleProfile | null> {
  const updated: Record<string, RoleProfile | null> = { ...existing };
  for (const [role, resource] of Object.entries(merged)) {
    setRoleValue(updated, role, {
      name: mergeNames(resource.name),
      photoUrl: resource.photo?.[0]?.url ?? '',
      resource
    });
  }
  return updated;
}
