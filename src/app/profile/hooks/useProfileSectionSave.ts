'use client';

import { useAuth } from '@/context/auth/authContext';
import { dbSet, STORES } from '@/lib/indexeddb';
import { submitFhirBundle } from '@/services/api/fhir-bundle';
import { useUpdateProfile } from '@/services/profile';
import type { ProfileResource } from '@/services/role-profiles';
import { collapseHumanName } from '@/utils/fhir/human-name';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import type { FhirResourceType } from '@/utils/role-fhir';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import {
  assertBundleSuccess,
  buildProfileTransactionBundle,
  buildUpdatedRoleProfiles,
  collectCachedResources,
  mergeResources
} from '../multi-role-sync';
import { getRoleValue } from '../role-map';
import { useIdentitySync } from './useIdentitySync';

export type SectionSaveParams = {
  /** The active role's FHIR resource id. */
  fhirId: string;
  /** The FHIR resource type backing the active role. */
  resourceType: FhirResourceType;
  /** Merge this section's fields into the cached active resource. */
  merge: (latest: ProfileResource) => ProfileResource;
  /**
   * Per-role variant of `merge` for the other roles of a multi-role user.
   * Defaults to `merge`. Used to keep per-role fields (e.g. language)
   * out of the synced resources.
   */
  mergeOtherRoles?: (latest: ProfileResource) => ProfileResource;
  /** Run the identity sync (Chatwoot + auth cookie) after the save. */
  syncIdentity?: boolean;
  /** Called after a successful save (e.g. close the drawer). */
  onSuccess?: () => void;
};

type Result = {
  /** True while the merge-then-save is in flight. */
  isSaving: boolean;
  /** Merge the section fields into the cached resources and save. */
  saveSection: (params: SectionSaveParams) => Promise<void>;
};

/**
 * Generic per-section profile save. Reads the full role resources from the
 * auth cache (no refetch), merges only the drawer's fields into every owned
 * role resource, and persists them all-or-nothing — one transaction bundle
 * for multi-role users, a direct PUT for single-role users. On success the
 * merged resources are recached into the auth state + IndexedDB.
 */
export function useProfileSectionSave(): Result {
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const { state: authState, dispatch: dispatchAuth } = useAuth();
  const { syncIdentity } = useIdentitySync();
  const [isSaving, setIsSaving] = useState(false);

  const saveSection = useCallback(
    async (params: SectionSaveParams) => {
      setIsSaving(true);
      try {
        const userInfo = authState.userInfo;
        const existingRoleProfiles = userInfo?.roleProfiles ?? {};
        const activeRole = userInfo?.role_name ?? '';

        const resources = collectCachedResources(userInfo);
        if (!getRoleValue(resources, activeRole)) {
          throw new Error('Missing active profile resource');
        }

        // Merge each role with its own variant of the section merge.
        const merged = mergeResources(
          resources,
          activeRole,
          params.merge,
          params.mergeOtherRoles ?? params.merge
        );

        let savedActive: ProfileResource;
        if (Object.keys(merged).length > 1) {
          const activeMerged = getRoleValue(merged, activeRole);
          if (!activeMerged) {
            throw new Error('Missing active profile resource');
          }
          // Multi-role: one all-or-nothing transaction bundle. Prefer the
          // active role's copy when several roles share one FHIR resource.
          const response = await submitFhirBundle(
            buildProfileTransactionBundle(Object.values(merged), activeMerged)
          );
          assertBundleSuccess(response);
          savedActive = activeMerged;
        } else {
          const activeResource = getRoleValue(merged, activeRole);
          if (!activeResource) {
            throw new Error('Missing active profile resource');
          }
          const result = await updateProfile({ payload: activeResource });
          if (!result) throw new Error('Empty profile update response');
          savedActive = result;
        }

        const updatedRoleProfiles = buildUpdatedRoleProfiles(
          merged,
          existingRoleProfiles
        );

        if (params.syncIdentity) {
          await syncIdentity(
            savedActive,
            collapseHumanName(savedActive.name?.[0]),
            updatedRoleProfiles
          );
        } else {
          const payload = {
            ...userInfo,
            roleProfiles: updatedRoleProfiles,
            fullProfile: savedActive,
            profile_complete: isProfileCompleteFromFHIR(savedActive),
            cachedAt: Date.now()
          };
          dispatchAuth({ type: 'auth-check', payload });
          await dbSet(STORES.userProfile, payload);
        }

        toast.success('Profile updated');
        params.onSuccess?.();
      } catch (error) {
        console.error('[profile-section-save] failed', error);
        toast.error('Failed updating profile');
      } finally {
        setIsSaving(false);
      }
    },
    [authState.userInfo, updateProfile, dispatchAuth, syncIdentity]
  );

  return { isSaving, saveSection };
}
