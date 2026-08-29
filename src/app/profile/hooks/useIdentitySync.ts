'use client';

import { useAuth } from '@/context/auth/authContext';
import type { IStateUserInfo } from '@/context/auth/authTypes';
import { dbSet, STORES } from '@/lib/indexeddb';
import { modifyProfile } from '@/services/profile';
import type { RoleProfile } from '@/services/role-profiles';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import type { Patient, Practitioner } from 'fhir/r4';
import { useCallback } from 'react';
import { getClaimValue } from 'supertokens-auth-react/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';

type ProfileResource = Patient | Practitioner;

/** Read a telecom value (email/phone) from a FHIR profile. */
function findTelecomValue(profile: ProfileResource, system: string): string {
  return profile.telecom?.find(t => t.system === system)?.value ?? '';
}

/** Read the photo URL from a FHIR profile (always an Attachment array). */
function findPhotoUrl(profile: ProfileResource): string | undefined {
  return profile.photo?.[0]?.url;
}

/**
 * Build the auth payload persisted to the cookie and IndexedDB. Rebuilds the
 * identity fields from the saved active resource and carries the full
 * roleProfiles map (with resources) so the cache stays fresh after a save.
 */
function buildAuthPayload(
  existing: IStateUserInfo,
  profile: ProfileResource,
  fullname: string,
  superTokensRoles: string[] | undefined,
  roleProfiles: Record<string, RoleProfile | null>
): IStateUserInfo {
  const email =
    findTelecomValue(profile, 'email') || existing.email || undefined;
  const phone =
    findTelecomValue(profile, 'phone') || existing.phoneNumber || undefined;
  const photoUrl = findPhotoUrl(profile) ?? existing.profile_picture ?? '';
  return {
    userId: existing.userId,
    roles: superTokensRoles ??
      existing.roles ?? [existing.role_name ?? 'Patient'],
    role_name: existing.role_name,
    email: email || existing.email,
    phoneNumber: phone || existing.phoneNumber,
    fhirId: profile.id ?? existing.fhirId,
    fullname,
    profile_picture: photoUrl,
    profile_complete: isProfileCompleteFromFHIR(profile),
    roleProfiles,
    fullProfile: profile,
    cachedAt: Date.now()
  };
}

/**
 * Post-save identity sync: refresh the Chatwoot contact (name/email/phone),
 * rewrite the auth cookie with the updated identity, dispatch the new auth
 * state and persist it to IndexedDB. Best-effort on the Chatwoot step.
 *
 * @returns `syncIdentity(profile, fullname, roleProfiles?)` to run after a
 *   PUT that changed identity fields (name, email, phone). Pass the merged
 *   roleProfiles map for multi-role saves so every role is recached.
 */
export function useIdentitySync() {
  const { state: authState, dispatch: dispatchAuth } = useAuth();

  const syncIdentity = useCallback(
    async (
      profile: ProfileResource,
      fullname: string,
      roleProfiles?: Record<string, RoleProfile | null>
    ) => {
      const existing = authState.userInfo ?? {};
      const email =
        findTelecomValue(profile, 'email') || existing.email || undefined;
      const phone =
        findTelecomValue(profile, 'phone') || existing.phoneNumber || undefined;

      try {
        if (fullname && (email || phone)) {
          await modifyProfile({ name: fullname, email, phoneNumber: phone });
        }
      } catch (error) {
        console.error('[identity-sync] chatwoot sync failed', error);
      }

      const superTokensRoles = await getClaimValue({ claim: UserRoleClaim });
      const updatedRoleProfiles = roleProfiles ?? {
        ...existing.roleProfiles,
        [existing.role_name ?? '']: {
          name: fullname,
          photoUrl: findPhotoUrl(profile) ?? '',
          resource: profile
        }
      };
      const authPayload = buildAuthPayload(
        existing,
        profile,
        fullname,
        superTokensRoles,
        updatedRoleProfiles
      );

      const csrfToken = await fetch('/auth/cookie/csrf-token')
        .then(r =>
          r.ok ? r.json() : Promise.reject(new Error('CSRF fetch failed'))
        )
        .then((d: { token?: string }) => d.token ?? '')
        .catch(() => '');
      const cookieRes = await fetch('/auth/cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
        },
        body: JSON.stringify(authPayload)
      });
      if (!cookieRes.ok) {
        throw new Error(`auth cookie set failed: ${cookieRes.status}`);
      }

      dispatchAuth({ type: 'auth-check', payload: authPayload });
      await dbSet(STORES.userProfile, authPayload);
    },
    [authState.userInfo, dispatchAuth]
  );

  return { syncIdentity };
}
