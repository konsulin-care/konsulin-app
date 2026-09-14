'use client';

import QuestionnaireUploadDrawer from '@/components/shared/questionnaire-upload-drawer';
import { useAuth } from '@/context/auth/authContext';
import { STORES, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

type Props = {
  readonly open: boolean;
  readonly onClose: () => void;
};

/** Resolve the clinic Organization name to use as the publisher. */
async function resolvePublisherName(
  orgIdFromPref: string | undefined,
  fallbackOrgId: string | undefined
): Promise<string> {
  const orgId = orgIdFromPref ?? fallbackOrgId;
  if (!orgId) throw new Error('No clinic organization selected');

  const API = await getAPI();
  const orgResp = await API.get<{ name?: string }>(
    `/fhir/Organization/${orgId}?_elements=name`
  );
  return orgResp.data?.name ?? '';
}

/**
 * Drawer for adding a new Questionnaire to the clinic's assessment catalog.
 *
 * Wraps the shared QuestionnaireUploadDrawer with assessment-specific config:
 * shows fee and image fields, uses clinic org as publisher, and invalidates
 * assessment query caches on success.
 */
export default function AddAssessmentDrawer({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const { state: authState } = useAuth();

  const handleUploaded = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['curated-assessments'] }),
      queryClient.invalidateQueries({ queryKey: ['featured-assessments'] })
    ]).catch(() => {
      /* cache invalidation best-effort */
    });
  }, [queryClient]);

  const resolvePublisher = useCallback(async () => {
    const clinicPref = await dbGet<{ value: string }>(STORES.uiPreferences, [
      '',
      'clinic_organization'
    ]);
    const user = authState?.userInfo;
    return resolvePublisherName(clinicPref?.value, user?.organizationId);
  }, [authState?.userInfo]);

  const handleResolvePublisher = useCallback(
    () => resolvePublisher(),
    [resolvePublisher]
  );

  return (
    <QuestionnaireUploadDrawer
      open={open}
      onClose={onClose}
      onUploaded={handleUploaded}
      showFee={true}
      showImage={true}
      context='assessment'
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      resolvePublisher={handleResolvePublisher}
    />
  );
}
