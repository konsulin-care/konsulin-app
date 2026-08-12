'use client';

import { getProfileById, useUpdateProfile } from '@/services/profile';
import { collapseHumanName } from '@/utils/fhir/human-name';
import type { FhirResourceType } from '@/utils/role-fhir';
import { useQueryClient } from '@tanstack/react-query';
import type { Patient, Person, Practitioner } from 'fhir/r4';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { useIdentitySync } from './useIdentitySync';

type ProfileResource = Patient | Practitioner | Person;

export type SectionSaveParams = {
  /** The active role's FHIR resource id. */
  fhirId: string;
  /** The FHIR resource type backing the active role. */
  resourceType: FhirResourceType;
  /** Merge this section's fields into the freshly fetched resource. */
  merge: (latest: ProfileResource) => ProfileResource;
  /** Run the identity sync (Chatwoot + auth cookie) after the PUT. */
  syncIdentity?: boolean;
  /** Called after a successful save (e.g. close the drawer). */
  onSuccess?: () => void;
};

type Result = {
  /** True while the merge-then-PUT is in flight. */
  isSaving: boolean;
  /** Fetch latest, merge the section fields and PUT the full resource. */
  saveSection: (params: SectionSaveParams) => Promise<void>;
};

/**
 * Generic per-section profile save: refetch the latest resource, merge only
 * the drawer's fields, PUT the full resource back, then invalidate the
 * profile caches. Identity-bearing sections (name, contact) opt into the
 * Chatwoot + auth-cookie sync via `syncIdentity`.
 */
export function useProfileSectionSave(): Result {
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const queryClient = useQueryClient();
  const { syncIdentity } = useIdentitySync();
  const [isSaving, setIsSaving] = useState(false);

  const saveSection = useCallback(
    async (params: SectionSaveParams) => {
      setIsSaving(true);
      try {
        const latest = await getProfileById(params.fhirId, params.resourceType);
        const payload = params.merge(latest);
        const result = await updateProfile({ payload });
        if (!result) throw new Error('Empty profile update response');

        if (params.syncIdentity) {
          await syncIdentity(result, collapseHumanName(result.name?.[0]));
        }

        await queryClient.invalidateQueries({
          queryKey: ['profile-data', params.fhirId]
        });
        await queryClient.invalidateQueries({ queryKey: ['role-profiles'] });
        toast.success('Profile updated');
        params.onSuccess?.();
      } catch (error) {
        console.error('[profile-section-save] failed', error);
        toast.error('Failed updating profile');
      } finally {
        setIsSaving(false);
      }
    },
    [updateProfile, queryClient, syncIdentity]
  );

  return { isSaving, saveSection };
}
