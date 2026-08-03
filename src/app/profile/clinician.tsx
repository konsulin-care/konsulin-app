'use client';

import InformationDetail from '@/components/profile/information-detail';
import ProfileActions from '@/components/profile/ProfileActions';
import { Skeleton } from '@/components/ui/skeleton';
import { settingMenus } from '@/constants/profile';
import { useAuth } from '@/context/auth/authContext';
import { useUpdatePractitionerInfo } from '@/services/clinicians';
import { getProfileById } from '@/services/profile';
import { findAge, generateAvatarPlaceholder, mapAddress } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { Practitioner } from 'fhir/r4';
import { useRouter } from 'next/navigation';

type Props = { fhirId: string };

/** Build profile detail array from practitioner data. */
function buildProfileDetail(
  profileData: Practitioner | undefined
): Array<{ key: string; value: string }> {
  const age = profileData?.birthDate
    ? `${format(new Date(profileData.birthDate), 'dd-MM-yyyy')} (${findAge(profileData.birthDate)})`
    : '-';
  const gender = profileData?.gender
    ? `${profileData.gender.charAt(0).toUpperCase()}${profileData.gender.slice(1).toLowerCase()}`
    : '-';
  const phone =
    profileData && Array.isArray(profileData.telecom)
      ? (profileData.telecom.find(item => item.system === 'phone')?.value ??
        '-')
      : '-';
  const address =
    profileData && Array.isArray(profileData.address)
      ? mapAddress(profileData.address)
      : '-';
  return [
    { key: 'Birth(Age)', value: age },
    { key: 'Sex', value: gender },
    { key: 'Whatsapp', value: phone },
    { key: 'Address', value: address }
  ];
}

/** General information section with loading skeleton. */
function GeneralInfoSection({
  loading,
  profileData,
  profileDetail,
  initials,
  backgroundColor,
  seed,
  displayName,
  onEdit
}: {
  readonly loading: boolean;
  readonly profileData?: Practitioner;
  readonly profileDetail: Array<{ key: string; value: string }>;
  readonly initials: string;
  readonly backgroundColor: string;
  readonly seed: string;
  readonly displayName: string;
  readonly onEdit: () => void;
}) {
  if (loading) {
    return (
      <Skeleton className='my-4 h-[200px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
    );
  }
  return (
    <div className='my-4'>
      <InformationDetail
        isRadiusIcon
        initials={initials}
        backgroundColor={backgroundColor}
        seed={seed}
        iconUrl={profileData?.photo?.[0]?.url}
        title='General Information'
        subTitle={displayName}
        buttonText='Edit Profile'
        details={profileDetail}
        onEdit={onEdit}
        role='clinician'
      />
    </div>
  );
}

/** Clinician profile page with info and actions. */
export default function Clinician({ fhirId }: Props) {
  const router = useRouter();
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const { data: profileData, isLoading: isProfileLoading } =
    useQuery<Practitioner>({
      queryKey: ['profile-data', fhirId],
      queryFn: () =>
        getProfileById(fhirId, 'Practitioner') as Promise<Practitioner>
    });

  useUpdatePractitionerInfo();

  const profileDetail = buildProfileDetail(profileData);
  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id: authState.userInfo?.fhirId,
    name: authState.userInfo?.fullname,
    email: authState.userInfo?.email
  });
  const displayName =
    !authState.userInfo?.fullname || authState.userInfo?.fullname.trim() === '-'
      ? (authState.userInfo?.email ?? '')
      : authState.userInfo.fullname;

  return (
    <>
      <GeneralInfoSection
        loading={isProfileLoading || isAuthLoading}
        profileData={profileData}
        profileDetail={profileDetail}
        initials={initials ?? ''}
        backgroundColor={backgroundColor ?? ''}
        seed={seed}
        displayName={displayName}
        onEdit={() => router.push('/profile?path=edit-profile')}
      />
      <div className='my-4' />
      <ProfileActions menus={settingMenus} />
    </>
  );
}
