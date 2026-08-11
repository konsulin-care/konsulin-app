import { getAPI } from '@/services/api';
import { mergeNames } from '@/utils/helper';
import { roleToFhirResource } from '@/utils/role-fhir';
import type { Bundle, HumanName } from 'fhir/r4';

/** Shape of the FHIR profile fields this service reads. */
interface ProfileResourceShape {
  name?: HumanName[];
  photo?: Array<{ url?: string }>;
}

/** A resolved role profile: display name and photo URL. */
export interface RoleProfile {
  name: string;
  photoUrl: string;
}

/**
 * Extract the profile summary from a searchset Bundle response.
 *
 * @param bundle - The FHIR searchset returned for one role identifier query.
 * @returns The profile summary, or null when the resource is missing or
 *   has no usable name (caller falls back to placeholder initials).
 */
function parseRoleProfile(bundle: Bundle): RoleProfile | null {
  const resource = bundle?.entry?.[0]?.resource as
    | ProfileResourceShape
    | undefined;
  if (!resource) return null;
  const name = mergeNames(resource.name ?? []);
  if (!name || name === '-') return null;
  return { name, photoUrl: resource.photo?.[0]?.url ?? '' };
}

/**
 * Fetch profile summaries for every role of a user in parallel.
 *
 * Issues one identifier-based FHIR search per role (Patient, Practitioner,
 * Person via roleToFhirResource) with `_elements=name,photo` to keep the
 * payload minimal. Uses Promise.allSettled so a failed or missing profile
 * for one role never blocks the others.
 *
 * @param userId - The SuperTokens user ID used as the FHIR identifier value.
 * @param roles - The role names to fetch profiles for.
 * @returns A map from role name to its profile summary, or null when the
 *   profile is missing, empty, or the request failed.
 */
export async function fetchRoleProfiles(
  userId: string,
  roles: string[]
): Promise<Record<string, RoleProfile | null>> {
  const API = await getAPI();
  const results = await Promise.allSettled(
    roles.map(role =>
      API.get<Bundle>(
        `/fhir/${roleToFhirResource(role)}?identifier=https://login.konsulin.care/userid|${encodeURIComponent(userId)}&_elements=name,photo`
      )
    )
  );

  const profiles: Record<string, RoleProfile | null> = {};
  roles.forEach((role, index) => {
    const settled = results[index];
    profiles[role] =
      settled.status === 'fulfilled'
        ? parseRoleProfile(settled.value.data)
        : null;
  });
  return profiles;
}
