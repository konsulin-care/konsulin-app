'use client';

import { useAuth } from '@/context/auth/authContext';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import { Patient, Practitioner } from 'fhir/r4';

/**
 * Checks profile completeness using the server flag (authState) as primary
 * source, falling back to local FHIR resource inspection.
 */
export function useProfileCompleteness(profile?: Patient | Practitioner) {
  const { state: authState } = useAuth();

  const serverComplete = authState.userInfo?.profile_complete;
  const locallyComplete = profile ? isProfileCompleteFromFHIR(profile) : null;

  const isComplete = serverComplete ?? locallyComplete ?? false;

  return { isComplete, showBanner: !isComplete };
}
