'use client';

import {
  getProfileById,
  modifyProfile,
  uploadAvatar,
  useUpdateProfile
} from '@/services/profile';
import { findIdentifierValue } from '@/utils/helper';
import { processImageForAvatar } from '@/utils/image-processing';
import { useQueryClient } from '@tanstack/react-query';
import type { Patient, Person, Practitioner } from 'fhir/r4';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

type ProfileResource = Patient | Practitioner | Person;

const CHATWOOT_ID_SYSTEM = 'https://login.konsulin.care/chatwoot-id';

type Params = {
  /** The active role's FHIR resource id. */
  fhirId: string;
  /** The FHIR resource type backing the active role. */
  resourceType: 'Patient' | 'Practitioner' | 'Person';
  /** The currently loaded profile, used to read the existing photo/chatwoot id. */
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
 * Immediate profile photo upload: process the picked file, upload it via
 * Chatwoot, merge the returned URL into the FHIR resource and PUT it back.
 * Person stores a single Attachment; Patient/Practitioner store an array.
 */
export function useProfilePhotoSave({
  fhirId,
  resourceType,
  profile,
  fallbackName,
  fallbackEmail,
  fallbackPhone
}: Params): Result {
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const queryClient = useQueryClient();
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

        const latest = await getProfileById(fhirId, resourceType);
        const photo =
          resourceType === 'Person'
            ? { url: uploadedUrl }
            : [{ url: uploadedUrl }];
        const payload = { ...latest, photo } as ProfileResource;
        await updateProfile({ payload });

        await queryClient.invalidateQueries({
          queryKey: ['profile-data', fhirId]
        });
        await queryClient.invalidateQueries({ queryKey: ['role-profiles'] });
        toast.success('Profile photo updated');
      } catch (error) {
        console.error('[avatar] profile photo update failed', error);
        toast.error('Failed updating the profile picture');
      } finally {
        setIsUploading(false);
      }
    },
    [fhirId, resourceType, ensureChatwootId, updateProfile, queryClient]
  );

  return { isUploading, handleFileSelected };
}
