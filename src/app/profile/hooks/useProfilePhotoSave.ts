'use client';

import { useAuth } from '@/context/auth/authContext';
import type { IActionAuth, IStateUserInfo } from '@/context/auth/authTypes';
import { dbSet, STORES } from '@/lib/indexeddb';
import { submitFhirBundle } from '@/services/api/fhir-bundle';
import {
  modifyProfile,
  uploadAvatar,
  useUpdateProfile
} from '@/services/profile';
import type { ProfileResource, RoleProfile } from '@/services/role-profiles';
import { findIdentifierValue } from '@/utils/helper';
import { processImageForAvatar } from '@/utils/image-processing';
import type { Dispatch } from 'react';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import {
  assertBundleSuccess,
  buildProfileTransactionBundle,
  buildUpdatedRoleProfiles,
  collectCachedResources
} from '../multi-role-sync';

const CHATWOOT_ID_SYSTEM = 'https://login.konsulin.care/chatwoot-id';

/** Merge the uploaded photo into every resource with the per-type shape. */
function mergePhoto(
  resources: Record<string, ProfileResource>,
  url: string
): Record<string, ProfileResource> {
  const merged: Record<string, ProfileResource> = {};
  for (const [role, resource] of Object.entries(resources)) {
    const photo = resource.resourceType === 'Person' ? { url } : [{ url }];
    merged[role] = { ...resource, photo } as ProfileResource;
  }
  return merged;
}

/** Recache the merged resources into the auth state and IndexedDB. */
async function recacheProfiles(
  userInfo: IStateUserInfo | undefined,
  merged: Record<string, ProfileResource>,
  uploadedUrl: string,
  existingRoleProfiles: Record<string, RoleProfile | null> | undefined,
  dispatchAuth: Dispatch<IActionAuth>
): Promise<void> {
  const updatedRoleProfiles = buildUpdatedRoleProfiles(
    merged,
    existingRoleProfiles
  );
  const payload = {
    ...userInfo,
    profile_picture: uploadedUrl,
    roleProfiles: updatedRoleProfiles,
    fullProfile: merged[userInfo?.role_name ?? ''] ?? Object.values(merged)[0],
    cachedAt: Date.now()
  };
  dispatchAuth({ type: 'auth-check', payload });
  await dbSet(STORES.userProfile, payload);
}

type Params = {
  /** The active role's FHIR resource id. */
  fhirId: string;
  /** The FHIR resource type backing the active role. */
  resourceType: 'Patient' | 'Practitioner' | 'Person';
  /** The currently loaded active profile, used to read the chatwoot id. */
  profile?: ProfileResource;
  /** Identity fallbacks used to create a Chatwoot contact when no id exists. */
  fallbackName?: string;
  fallbackEmail?: string;
  fallbackPhone?: string;
};

type Result = {
  /** True while the image is being processed, uploaded and persisted. */
  isUploading: boolean;
  /** Process, upload and persist a picked photo immediately. */
  handleFileSelected: (file: File) => Promise<void>;
};

/**
 * Immediate profile photo upload: process the picked file, upload it once via
 * Chatwoot, merge the returned URL into every cached role resource (Person
 * stores a single Attachment, Patient/Practitioner an array) and persist them
 * all-or-nothing — one transaction bundle for multi-role users, a direct PUT
 * for single-role users. On success the merged resources are recached into
 * the auth state + IndexedDB; no refetch happens.
 */
export function useProfilePhotoSave({
  profile,
  fallbackName,
  fallbackEmail,
  fallbackPhone
}: Params): Result {
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const { state: authState, dispatch: dispatchAuth } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  /** Resolve a Chatwoot id, creating a contact via modifyProfile if needed. */
  const ensureChatwootId = useCallback(async (): Promise<string> => {
    const existing = findIdentifierValue(profile, CHATWOOT_ID_SYSTEM);
    if (existing) return existing;
    try {
      const { chatwootId } = await modifyProfile({
        name: fallbackName ?? '',
        email: fallbackEmail,
        phoneNumber: fallbackPhone
      });
      return chatwootId;
    } catch (error) {
      console.error('[avatar] chatwoot id resolution failed', error);
      return '';
    }
  }, [profile, fallbackName, fallbackEmail, fallbackPhone]);

  /** Process, upload and persist the picked photo. */
  const handleFileSelected = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const chatwootId = await ensureChatwootId();
        if (!chatwootId) {
          toast.error(
            'Profile does not own chatwoot_id; avatar update is cancelled'
          );
          return;
        }

        const processed = await processImageForAvatar(file);
        const uploadedUrl = await uploadAvatar(chatwootId, processed.blob);
        if (!uploadedUrl) throw new Error('Empty avatar URL');

        const userInfo = authState.userInfo;
        const existingRoleProfiles = userInfo?.roleProfiles ?? {};
        const activeRole = userInfo?.role_name ?? '';

        const resources = collectCachedResources(userInfo);
        if (!resources[activeRole]) {
          throw new Error('Missing active profile resource');
        }
        const merged = mergePhoto(resources, uploadedUrl);

        if (Object.keys(merged).length > 1) {
          const response = await submitFhirBundle(
            buildProfileTransactionBundle(Object.values(merged))
          );
          assertBundleSuccess(response);
        } else {
          const result = await updateProfile({ payload: merged[activeRole] });
          if (!result) throw new Error('Empty profile update response');
        }

        await recacheProfiles(
          userInfo,
          merged,
          uploadedUrl,
          existingRoleProfiles,
          dispatchAuth
        );

        toast.success('Profile photo updated');
      } catch (error) {
        console.error('[avatar] profile photo update failed', error);
        toast.error('Failed updating the profile picture');
      } finally {
        setIsUploading(false);
      }
    },
    [ensureChatwootId, updateProfile, authState, dispatchAuth]
  );

  return { isUploading, handleFileSelected };
}
