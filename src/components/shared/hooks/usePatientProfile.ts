'use client';

import { getProfileById } from '@/services/profile';
import { mergeNames } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import { Patient } from 'fhir/r4';

/**
 *
 */
export function usePatientProfile(patientId: string) {
  const { data: patientProfile, isLoading: isProfileLoading } =
    useQuery<Patient>({
      queryKey: ['profile-patient', patientId],
      queryFn: () => getProfileById(patientId, 'Patient') as Promise<Patient>,
      enabled: Boolean(patientId)
    });

  const fullName = mergeNames(patientProfile?.name);
  const email = patientProfile?.telecom?.find(
    item => item.system === 'email'
  )?.value;
  const displayName = fullName?.trim() === '-' ? email : fullName;

  return { patientProfile, displayName, isProfileLoading };
}
