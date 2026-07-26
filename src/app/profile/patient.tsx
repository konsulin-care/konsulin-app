'use client';

import InformationDetail from '@/components/profile/information-detail';
import ProfileActions from '@/components/profile/ProfileActions';
import { Skeleton } from '@/components/ui/skeleton';
import { settingMenus } from '@/constants/profile';
import { Roles } from '@/constants/roles';
import { useRouter } from 'next/navigation';
import { usePatientProfile } from './hooks/usePatientProfile';

type Props = {
  fhirId: string;
};

/** Patient profile page with profile info and account actions. */
export default function Patient({ fhirId }: Props) {
  const router = useRouter();
  const {
    profileData,
    isLoading,
    profileDetail,
    initials,
    backgroundColor,
    seed,
    fullname,
    email
  } = usePatientProfile(fhirId);

  return (
    <>
      {isLoading ? (
        <Skeleton className='h-[200px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      ) : (
        <InformationDetail
          isRadiusIcon
          initials={initials}
          backgroundColor={backgroundColor}
          seed={seed}
          iconUrl={profileData?.photo?.[0]?.url}
          title={fullname ?? '-'}
          subTitle={email ?? '-'}
          buttonText='Edit Profile'
          details={profileDetail}
          onEdit={() => router.push('/profile?path=edit-profile')}
          role={Roles.Patient}
        />
      )}
      <ProfileActions menus={settingMenus} />
    </>
  );
}
