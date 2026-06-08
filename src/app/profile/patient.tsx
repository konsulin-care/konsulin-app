'use client';

import InformationDetail from '@/components/profile/information-detail';
import Settings from '@/components/profile/settings';
import { Skeleton } from '@/components/ui/skeleton';
import { settingMenus } from '@/constants/profile';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { getProfileById } from '@/services/profile';
import { findAge, generateAvatarPlaceholder, mapAddress } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import type { ContactPoint, Patient } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

type Props = {
  fhirId: string;
};

/**
 *
 */
export default function Patient({ fhirId }: Props) {
  const router = useRouter();
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const { data: profileData, isLoading: isProfileLoading } = useQuery<Patient>({
    queryKey: ['profile-data', fhirId],
    queryFn: () => getProfileById(fhirId, 'Patient') as Promise<Patient>,
    enabled: Boolean(fhirId),
    onError: (error: Error) => {
      console.error('Error when fetching user profile: ', error);
      toast.error(error.message);
    }
  });

  /** Find a telecom value by system (phone/email). */
  const findTelecom = (system: string) => {
    const found = profileData.telecom.find(
      (item: ContactPoint) => item.system === system
    );

    if (!found) return '-';

    return found.value;
  };

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

  const profileDetail = [
    {
      key: 'Age',
      value: age
    },
    { key: 'Sex', value: gender },
    { key: 'Whatsapp', value: phone },
    {
      key: 'Address',
      value: address
    }
  ];

  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id: authState.userInfo?.fhirId,
    name: authState.userInfo?.fullname,
    email: authState.userInfo?.email
  });

  return (
    <>
      {isProfileLoading || isAuthLoading ? (
        <Skeleton className='h-[200px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      ) : (
        <InformationDetail
          isRadiusIcon
          initials={initials}
          backgroundColor={backgroundColor}
          seed={seed}
          iconUrl={profileData?.photo?.[0].url}
          title={authState.userInfo.fullname}
          subTitle={authState.userInfo.email}
          buttonText='Edit Profile'
          details={profileDetail}
          onEdit={() => router.push('/profile?path=edit-profile')}
          role={Roles.Patient}
        />
      )}

      <Settings menus={settingMenus} />
    </>
  );
}
