'use client';

import { useAuth } from '@/context/auth/authContext';
import { getProfileById } from '@/services/profile';
import { findAge, generateAvatarPlaceholder, mapAddress } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import type { ContactPoint, Patient } from 'fhir/r4';
import { useMemo } from 'react';

/** Fetches & transforms patient profile for display. Returns data, loading, detail fields, and avatar. */
export function usePatientProfile(fhirId: string) {
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const { data: profileData, isLoading: isProfileLoading } = useQuery<Patient>({
    queryKey: ['profile-data', fhirId],
    queryFn: () => getProfileById(fhirId, 'Patient') as Promise<Patient>,
    enabled: Boolean(fhirId)
  });

  const profileDetail = useMemo(() => {
    const findTelecom = (system: string) =>
      profileData?.telecom?.find((item: ContactPoint) => item.system === system)
        ?.value ?? '-';
    const age = profileData?.birthDate
      ? `${findAge(profileData.birthDate)} year`
      : '-';
    const gender = profileData?.gender
      ? profileData.gender.charAt(0).toUpperCase() +
        profileData.gender.slice(1).toLowerCase()
      : '-';
    const phone =
      profileData && Array.isArray(profileData.telecom)
        ? findTelecom('phone')
        : '-';
    const address =
      profileData && Array.isArray(profileData.address)
        ? mapAddress(profileData.address)
        : '-';
    return [
      { key: 'Age', value: age },
      { key: 'Sex', value: gender },
      { key: 'Whatsapp', value: phone },
      { key: 'Address', value: address }
    ];
  }, [profileData]);

  const avatar = useMemo(
    () =>
      generateAvatarPlaceholder({
        id: authState.userInfo?.fhirId,
        name: authState.userInfo?.fullname,
        email: authState.userInfo?.email
      }),
    [authState.userInfo]
  );

  return {
    profileData,
    isLoading: isProfileLoading || isAuthLoading,
    isAuthLoading,
    profileDetail,
    initials: avatar.initials ?? '',
    backgroundColor: avatar.backgroundColor ?? '',
    seed: avatar.seed,
    fullname: authState.userInfo?.fullname,
    email: authState.userInfo?.email
  };
}
