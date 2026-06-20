'use client';

import type { ContactPoint, Identifier, Patient, Practitioner } from 'fhir/r4';
import { toast } from 'react-toastify';

import { DRAWER_STATE } from '@/constants/profile';
import { findIdentifierValue, mergeNames } from '@/utils/helper';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import { validateEmail } from '@/utils/validation';
import { getProfileById, modifyProfile } from '@/services/profile';

import type { FHIRProfile } from '@/types/fhir';
import type { ICustomProfile } from '../edit-profile';

type UseProfileSaveParams = {
  updateUser: ICustomProfile;
  fhirId: string;
  fhirRole: 'Patient' | 'Practitioner';
  authState: {
    userInfo?: {
      email?: string;
      phoneNumber?: string;
      userId?: string;
      fullname?: string;
      profile_picture?: string;
      roles?: string[];
      fhirId?: string;
      role_name?: string;
    };
  };
  resolvePhotoUrl: (
    existingPhotoUrl: string,
    finalChatwootId: string,
    isValidUrl: (url: string) => boolean
  ) => Promise<string>;
  isValidUrl: (url: string) => boolean;
  updateProfile: (args: { payload: Patient | Practitioner }) => Promise<unknown>;
  clearDraft: () => void;
  dispatchAuth: (action: { type: string; payload: unknown }) => void;
  queryClient: { invalidateQueries: (args: unknown) => void };
  setDrawerState: (state: string) => void;
};

type UseProfileSaveResult = {
  handleEditSave: () => Promise<void>;
};

/**
 * Hook providing the profile save orchestration logic.
 * All dependencies are passed as params to avoid circularities.
 */
export function useProfileSave({
  updateUser,
  fhirId,
  fhirRole,
  authState,
  resolvePhotoUrl,
  isValidUrl,
  updateProfile,
  clearDraft,
  dispatchAuth,
  queryClient,
  setDrawerState
}: UseProfileSaveParams): UseProfileSaveResult {
  /** Build telecom array from phone/email fields. */
  const buildTelecom = () => {
    const telecomArray: {
      system: 'phone' | 'email';
      use: 'mobile' | 'home';
      value: string;
    }[] = [];
    if (updateUser.phone?.trim()) {
      telecomArray.push({
        system: 'phone',
        use: 'mobile',
        value: updateUser.phone.trim()
      });
    }
    if (updateUser.email?.trim() && validateEmail(updateUser.email)) {
      telecomArray.push({
        system: 'email',
        use: 'home',
        value: updateUser.email.trim()
      });
    }
    return telecomArray;
  };

  /** Sync user identity with Chatwoot omnichannel. */
  const syncChatwootIdentifier = async (
    latestProfile: FHIRProfile,
    existingChatwootId: string
  ) => {
    const trimmedName = [updateUser.firstName, updateUser.lastName?.trim()]
      .filter(Boolean)
      .join(' ')
      .trim();
    const authEmail = authState.userInfo?.email || '';
    const authPhone = authState.userInfo?.phoneNumber || '';
    const isEmailBased = Boolean(authEmail.trim());
    const isPhoneBased = Boolean(authPhone.trim());
    const emailForModifyProfile = (updateUser.email || authEmail).trim();
    const phoneForModifyProfile = (updateUser.phone || authPhone).trim();
    const shouldCall =
      trimmedName &&
      (isEmailBased
        ? emailForModifyProfile && validateEmail(emailForModifyProfile)
        : isPhoneBased && Boolean(phoneForModifyProfile));

    let finalChatwootId = existingChatwootId;
    if (shouldCall) {
      try {
        const { chatwootId } = await modifyProfile({
          name: trimmedName,
          ...(isEmailBased
            ? { email: emailForModifyProfile }
            : { phoneNumber: phoneForModifyProfile })
        });
        if (chatwootId && chatwootId !== existingChatwootId)
          finalChatwootId = chatwootId;
      } catch (error) {
        console.error(
          '[update-chatwoot-id] failed to ensure chatwoot_id exists',
          error
        );
      }
    }

    const identifiers = latestProfile?.identifier
      ? [...latestProfile.identifier]
      : [];
    /** Ensure an identifier exists with the given system/value. */
    const ensureIdentifier = (system: string, value: string) => {
      if (!system || !value) return;
      const exists = identifiers.find(id => id.system === system);
      if (exists) exists.value = value;
      else identifiers.push({ system, value });
    };
    ensureIdentifier('https://login.konsulin.care/userid', updateUser.userId);
    ensureIdentifier(
      'https://login.konsulin.care/chatwoot-id',
      finalChatwootId
    );
    return { finalChatwootId, identifiers };
  };

  /** Push identifier changes to FHIR if chatwoot ID changed. */
  const syncIdentifierIfNeeded = async (
    latestProfile: FHIRProfile,
    identifiers: Identifier[],
    telecom: ContactPoint[],
    finalChatwootId: string,
    existingChatwootId: string
  ) => {
    if (existingChatwootId && existingChatwootId === finalChatwootId) return;
    if (!latestProfile) {
      toast.error('Failed updating profile');
      return;
    }
    try {
      await updateProfile({
        payload: { ...latestProfile, identifier: identifiers, telecom }
      } as Parameters<typeof updateProfile>[0]);
    } catch (error) {
      console.error('Error when syncing chatwoot identifier: ', error);
      toast.error('Failed to sync profile to Konsulin Omnichannel');
    }
  };

  /** Build the FHIR Patient/Practitioner payload for update. */
  const buildUpdatePayload = (
    identifiers: Identifier[],
    telecom: ContactPoint[],
    photoUrlForPayload: string
  ): Patient | Practitioner => {
    const splitName = (updateUser.firstName || '').split(' ').filter(Boolean);
    const familyName = updateUser.lastName?.trim() || undefined;
    return {
      resourceType: (updateUser.resourceType || fhirRole) as 'Patient' | 'Practitioner',
      id: updateUser.fhirId,
      active: updateUser.active,
      birthDate: updateUser.birthDate,
      gender: updateUser.gender,
      photo: photoUrlForPayload ? [{ url: photoUrlForPayload }] : [],
      identifier: identifiers,
      name: [
        {
          use: 'official',
          given: splitName,
          ...(familyName ? { family: familyName } : {})
        }
      ],
      address: [
        {
          use: 'home',
          type: 'physical',
          line: updateUser.addresses,
          district: updateUser.district,
          city: updateUser.city,
          postalCode: updateUser.postalCode,
          country: 'ID'
        }
      ],
      telecom
    };
  };

  /** Orchestrate full profile save: fetch, sync, upload, persist. */
  const handleEditSave = async () => {
    let latestProfile: FHIRProfile = null;
    try {
      latestProfile = await getProfileById(fhirId, fhirRole);
    } catch (error) {
      console.error('Error when refetching user profile: ', error);
      toast.error('Failed to fetch the latest profile');
      return;
    }

    const existingPhotoUrl = latestProfile?.photo?.[0]?.url ?? '';
    const existingChatwootId = latestProfile
      ? findIdentifierValue(
          latestProfile,
          'https://login.konsulin.care/chatwoot-id'
        )
      : '';

    const { finalChatwootId, identifiers } = await syncChatwootIdentifier(
      latestProfile,
      existingChatwootId
    );
    const telecom = buildTelecom();

    await syncIdentifierIfNeeded(
      latestProfile,
      identifiers,
      telecom,
      finalChatwootId,
      existingChatwootId
    );

    const photoUrlForPayload = await resolvePhotoUrl(
      existingPhotoUrl,
      finalChatwootId,
      isValidUrl
    );
    if (
      typeof updateUser.photo === 'string' &&
      (updateUser.photo.startsWith('data:image/') ||
        updateUser.photo.includes(';base64,')) &&
      !photoUrlForPayload
    )
      return;

    const payload = buildUpdatePayload(
      identifiers,
      telecom,
      photoUrlForPayload
    );

    try {
      const result = await updateProfile({ payload });
      if (!result) return;

      const existing = authState.userInfo || {};
      const updatedPhotoUrl =
        (result as Patient | Practitioner)?.photo?.[0]?.url ||
        photoUrlForPayload ||
        existing.profile_picture;
      const updatedFullname =
        (result as Patient | Practitioner).resourceType === 'Practitioner'
          ? mergeNames(
              (result as Practitioner).name,
              (result as Practitioner)?.qualification
            )
          : mergeNames((result as Patient).name);

      const authPayload = {
        userId: existing.userId,
        roles: existing.roles || [existing.role_name || 'Patient'],
        role_name: existing.role_name,
        email: updateUser.email || existing.email,
        phoneNumber: updateUser.phone || existing.phoneNumber,
        fhirId: (result as Practitioner | Patient).id || existing.fhirId,
        fullname: updatedFullname,
        profile_picture: updatedPhotoUrl,
        profile_complete: isProfileCompleteFromFHIR(
          result as Patient | Practitioner
        )
      };

      const csrfToken = await fetch('/auth/cookie/csrf-token')
        .then(r =>
          r.ok ? r.json() : Promise.reject(new Error('CSRF fetch failed'))
        )
        .then(d => (d as { token?: string }).token ?? '')
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
      clearDraft();
      dispatchAuth({ type: 'auth-check', payload: authPayload });
      queryClient.invalidateQueries({ queryKey: ['profile-data', fhirId] });
      setDrawerState(DRAWER_STATE.SUCCESS);
    } catch (error) {
      console.error('Error when updating profile: ', error);
      toast.error('Failed updating the profile');
    }
  };

  return { handleEditSave };
}
