'use client';

import ClinicianPracticeSchedule from '@/components/profile/clinician-practice-schedule';
import ClinicianUnavailabilityCard from '@/components/profile/clinician-unavailability-card';
import InformationDetail from '@/components/profile/information-detail';
import Settings from '@/components/profile/settings';
import { Skeleton } from '@/components/ui/skeleton';
import { settingMenus } from '@/constants/profile';
import { useAuth } from '@/context/auth/authContext';
import {
  useGetPractitionerRolesDetail,
  useUpdatePractitionerInfo
} from '@/services/clinicians';
import { getProfileById } from '@/services/profile';
import { findAge, generateAvatarPlaceholder, mapAddress } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Practitioner,
  PractitionerRoleAvailableTime
} from 'fhir/r4';

import type { IPractitionerRoleDetail } from '@/types/practitioner';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Props = {
  fhirId: string;
};

/**
 * Renders the clinician profile page including general and practice information, and availability overview.
 *
 * Displays practitioner's basic profile details, practice information, availability grouped by organization and day.
 *
 * @param fhirId - The practitioner's FHIR resource ID used to fetch profile and role data.
 * @returns The JSX element for the Clinician profile page.
 */

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

/**
 *
 */
// eslint-disable-next-line complexity
export default function Clinician({ fhirId }: Props) {
  const router = useRouter();
  const [practitionerRolesData, setPractitionerRolesData] = useState<
    IPractitionerRoleDetail[]
  >([]);
  const [groupedByFirmAndDay, setGroupedByFirmAndDay] = useState<
    Record<
      string,
      {
        availability: Record<
          string,
          Array<{ fromTime: string; toTime: string }>
        >;
      }
    >
  >({});
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  /* get practitioner's basic information*/
  const { data: profileData, isLoading: isProfileLoading } =
    useQuery<Practitioner>({
      queryKey: ['profile-data', fhirId],
      queryFn: () =>
        getProfileById(fhirId, 'Practitioner') as Promise<Practitioner>
    });

  /* get list of practitioner's roles */
  const { refetch, isLoading: isPractitionerRolesLoading } =
    useGetPractitionerRolesDetail(authState.userInfo?.fhirId ?? '', data => {
      const resources = (data?.map(entry => entry.resource) || []).filter(
        Boolean
      );
      setPractitionerRolesData(resources);
    });

  useUpdatePractitionerInfo();

  const activeFirms = practitionerRolesData?.filter(firm => firm.active);

  /* group available time slots by organization and day of week.
   * example structure:
   * {
   *   "Org A": {
   *     availability: {
   *       Monday: [{ fromTime: "09:00", toTime: "12:00" }, ...],
   *       Tuesday: [...],
   *     }
   *   },
   *   ...
   * }
   */
  const processTimeSlot = (
    timeSlot: PractitionerRoleAvailableTime,
    organizationName: string,
    grouped: Record<
      string,
      {
        availability: Record<
          string,
          Array<{ fromTime: string; toTime: string }>
        >;
      }
    >
  ) => {
    if (!Array.isArray(timeSlot.daysOfWeek)) return;
    timeSlot.daysOfWeek.forEach((day: string) => {
      const dayKey = day.charAt(0).toUpperCase() + day.slice(1);

      if (!grouped[organizationName]) {
        grouped[organizationName] = {
          availability: {}
        };
      }

      if (!grouped[organizationName].availability[dayKey]) {
        grouped[organizationName].availability[dayKey] = [];
      }

      grouped[organizationName].availability[dayKey].push({
        fromTime: timeSlot.availableStartTime ?? '',
        toTime: timeSlot.availableEndTime ?? ''
      });
    });
  };

  useEffect(() => {
    if (!Array.isArray(activeFirms)) return;

    const newGroupedByFirmAndDay: Record<
      string,
      {
        availability: Record<
          string,
          Array<{ fromTime: string; toTime: string }>
        >;
      }
    > = {};

    activeFirms.forEach(role => {
      if (!role) return;
      const organizationName = role.organizationData?.name || '';

      if (Array.isArray(role.availableTime)) {
        role.availableTime.forEach(
          (timeSlot: PractitionerRoleAvailableTime) => {
            processTimeSlot(timeSlot, organizationName, newGroupedByFirmAndDay);
          }
        );
      }
    });

    setGroupedByFirmAndDay(newGroupedByFirmAndDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practitionerRolesData]);



  const profileDetail = buildProfileDetail(profileData);

  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id: authState.userInfo?.fhirId,
    name: authState.userInfo?.fullname,
    email: authState.userInfo?.email
  });

  const displayName =
    !authState.userInfo?.fullname || authState.userInfo?.fullname.trim() === '-'
      ? authState.userInfo?.email
      : authState.userInfo?.fullname;

  return (
    <>
      {/* display practitioner's basic information */}
      {isProfileLoading || isAuthLoading ? (
        <Skeleton className='my-4 h-[200px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      ) : (
        <div className='my-4'>
          <InformationDetail
            isRadiusIcon
            initials={initials ?? ''}
            backgroundColor={backgroundColor ?? ''}
            seed={seed}
            iconUrl={profileData?.photo?.[0]?.url}
            title='General Information'
            subTitle={displayName}
            buttonText='Edit Profile'
            details={profileDetail}
            onEdit={() => router.push('/profile?path=edit-profile')}
            role='clinician'
          />
        </div>
      )}

      <div className='my-4' />

      {/* display practitioner's practice information */}
      {isPractitionerRolesLoading ? (
        <Skeleton className='h-[200px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      ) : (
        <InformationDetail
          initials=''
          backgroundColor=''
          isRadiusIcon={false}
          iconUrl='/icons/hospital.svg'
          title='Practice Information'
          buttonText='Edit Detail'
          details={activeFirms}
          onEdit={() => router.push('/profile?path=edit-practice')}
          role='clinician'
          isEditPractice
        />
      )}

      <ClinicianPracticeSchedule
        groupedByFirmAndDay={groupedByFirmAndDay}
        onEditSchedule={() => router.push('/practitioner/availability')}
      />

      <ClinicianUnavailabilityCard />

      <Settings menus={settingMenus} />
    </>
  );
}
