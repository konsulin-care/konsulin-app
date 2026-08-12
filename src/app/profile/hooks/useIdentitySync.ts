'use client';

import { useAuth } from '@/context/auth/authContext';
import type { IStateUserInfo } from '@/context/auth/authTypes';
import { dbSet, STORES } from '@/lib/indexeddb';
import { modifyProfile } from '@/services/profile';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import type { Patient, Person, Practitioner } from 'fhir/r4';
import { useCallback } from 'react';
import { getClaimValue } from 'supertokens-auth-react/recipe/session';
import { UserRoleClaim } from 'supertokens-web-js/recipe/userroles';

type ProfileResource = Patient | Practitioner | Person;

/** Read a telecom value (email/phone) from a FHIR profile. */
function findTelecomValue(profile: ProfileResource, system: string): string {
  return profile.telecom?.find(t => t.system === system)?.value ?? '';
}

/** Read the photo URL — Person stores a single Attachment, others an array. */
function findPhotoUrl(profile: ProfileResource): string | undefined {
  if (profile.resourceType === 'Person') return profile.photo?.url;
  return profile.photo?.[0]?.url;
}

/** Build the auth payload persisted to the cookie and IndexedDB. */
function buildAuthPayload(
  existing: IStateUserInfo,
  profile: ProfileResource,
  fullname: string,
  superTokensRoles: string[] | undefined
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
    // Keep the role switcher map fresh after identity edits: preserve every
    // role and refresh the active role's name/photo from the saved resource.
    roleProfiles: {
      ...existing.roleProfiles,
      [existing.role_name ?? '']: {
        name: fullname,
        photoUrl
      }
    }
  };
}

/**
 * Post-save identity sync: refresh the Chatwoot contact (name/email/phone),
 * rewrite the auth cookie with the updated identity, dispatch the new auth
 * state and persist it to IndexedDB. Best-effort on the Chatwoot step.
 *
 * @returns `syncIdentity(profile, fullname)` to run after a PUT that changed
 *   identity fields (name, email, phone).
 */
export function useIdentitySync() {
  const { state: authState, dispatch: dispatchAuth } = useAuth();

  const syncIdentity = useCallback(
    async (profile: ProfileResource, fullname: string) => {
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
      const authPayload = buildAuthPayload(
        existing,
        profile,
        fullname,
        superTokensRoles
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
      await dbSet(STORES.userProfile, {
        ...authPayload,
        cachedAt: Date.now()
      });
    },
    [authState.userInfo, dispatchAuth]
  );

  return { syncIdentity };
}
