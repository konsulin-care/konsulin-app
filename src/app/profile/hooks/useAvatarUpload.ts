'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { toast } from 'react-toastify';

import { uploadAvatar } from '@/services/profile';
import { dataUrlToBlob, isDataUrl } from '@/utils/helper';
import { processImageForAvatar } from '@/utils/image-processing';

/** Converts a MIME type string to a file extension (jpg/png). */
export function getExtensionFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime.includes('/')) return mime.split('/')[1];
  return 'png';
}

type UseAvatarUploadParams = {
  /** The current user photo value (may be data URL, http URL, or empty). */
  photo: string;
  /** The FHIR resource ID for logging. */
  fhirId: string;
  /** Sets the uploading state. */
  setIsUploadingPhoto: (v: boolean) => void;
};

type UseAvatarUploadResult = {
  /** Resolves the final photo URL from the current photo state. */
  resolvePhotoUrl: (
    existingPhotoUrl: string,
    finalChatwootId: string,
    isValidUrl: (url: string) => boolean
  ) => Promise<string>;
};

/**
 * Hook providing avatar upload logic for the edit profile page.
 * Uses `processAvatarUpload` internally within `resolvePhotoUrl`.
 */
export function useAvatarUpload({
  photo,
  fhirId,
  setIsUploadingPhoto
}: UseAvatarUploadParams): UseAvatarUploadResult {
  /** Upload a new avatar photo and return the URL. */
  const processAvatarUpload = async (
    photoDataUrl: string,
    existingPhotoUrl: string,
    finalChatwootId: string
  ): Promise<string> => {
    if (!finalChatwootId) {
      console.error('[avatar] missing chatwoot_id, aborting upload', {
        fhirId
      });
      toast.error(
        'Profile does not own chatwoot_id; avatar update is cancelled'
      );
      return existingPhotoUrl;
    }
    setIsUploadingPhoto(true);
    try {
      const originalBlob = dataUrlToBlob(photoDataUrl);
      const mime = originalBlob.type || 'image/png';
      const ext = getExtensionFromMime(mime);
      const file = new File([originalBlob], `avatar.${ext}`, { type: mime });
      const processed = await processImageForAvatar(file, { outputType: mime });
      const fileForUpload = new File([processed.blob], `avatar.${ext}`, {
        type: processed.blob.type || mime
      });
      const uploadedUrl = await uploadAvatar(finalChatwootId, fileForUpload);
      if (!uploadedUrl)
        throw new Error('receive empty response from uploadAvatar');
      return uploadedUrl === existingPhotoUrl ? existingPhotoUrl : uploadedUrl;
    } catch (error) {
      const apiError = error as {
        message?: string;
        response?: { status?: number; data?: unknown };
      };
      console.error('[avatar] upload error', {
        message: apiError.message,
        status: apiError.response?.status,
        response: apiError.response?.data || error
      });
      toast.error('Failed updating the profile picture');
      return existingPhotoUrl;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  /** Resolves and uploads profile photo if needed, returns final photo URL. */
  const resolvePhotoUrl = async (
    existingPhotoUrl: string,
    finalChatwootId: string,
    isValidUrl: (url: string) => boolean
  ): Promise<string> => {
    if (isDataUrl(photo)) {
      return await processAvatarUpload(
        photo,
        existingPhotoUrl,
        finalChatwootId
      );
    }

    if (photo && isValidUrl(photo)) {
      const parsed = new URL(photo);
      if (
        ['http:', 'https:'].includes(parsed.protocol) &&
        photo !== existingPhotoUrl
      ) {
        return photo;
      }
    }
    return existingPhotoUrl || '';
  };

  return { resolvePhotoUrl };
}
