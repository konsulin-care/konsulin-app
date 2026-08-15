import type { IStateUserInfo } from '@/context/auth/authTypes';
import type { ProfileResource, RoleProfile } from '@/services/role-profiles';
import { mergeNames } from '@/utils/helper';
import type { Bundle } from 'fhir/r4';
import { getRoleValue, setRoleValue } from './role-map';

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
 * Collect the cached full resources from the auth state, skipping roles
 * without one. The active role falls back to `fullProfile`.
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
  return resources;
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
 * Build a FHIR transaction bundle that PUTs every merged role resource.
 *
 * The transaction is all-or-nothing: when any entry fails, the FHIR server
 * rejects the whole bundle so no partial profile update is ever persisted.
 *
 * @param resources - The merged resources (active + other roles) to write.
 * @returns A `type: 'transaction'` bundle with one PUT entry per resource.
 */
export function buildProfileTransactionBundle(
  resources: ProfileResource[]
): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: resources.map(resource => ({
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
