'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import ClinicianPracticeSchedule from '@/components/profile/clinician-practice-schedule';
import ClinicianUnavailabilityCard from '@/components/profile/clinician-unavailability-card';
import InformationDetail from '@/components/profile/information-detail';
import Settings from '@/components/profile/settings';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle
} from '@/components/ui/drawer';
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
import { Practitioner, PractitionerRole } from 'fhir/r4';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import PractitionerAvailabilityEditor from '../practitioner/practitioner-availability-editor';

type Props = {
  fhirId: string;
};

/**
 * Renders the clinician profile page including general and practice information, availability overview, and an availability editor drawer.
 *
 * Displays practitioner's basic profile details, practice information, availability grouped by organization and day, and controls to edit availability (per-day collapsible editors with time ranges). Handles data fetching, form state for availability editing, validation, and saving changes.
 *
 * @param fhirId - The practitioner's FHIR resource ID used to fetch profile and role data.
 * @returns The JSX element for the Clinician profile page.
 */

/** Content of the availability editor drawer. */
function DrawerBody({
  selectedPractitionerRoles,
  onSave,
  onCancel
}: Readonly<{
  selectedPractitionerRoles: PractitionerRole[];
  onSave: () => void;
  onCancel: () => void;
}>) {
  if (!selectedPractitionerRoles || selectedPractitionerRoles.length === 0) {
    return (
      <div className='flex h-full items-center justify-center'>
        <LoadingSpinnerIcon width={50} height={50} className='animate-spin' />
      </div>
    );
  }
  return (
    <PractitionerAvailabilityEditor
      practitionerRoles={selectedPractitionerRoles}
      onSuccess={onSave}
      onCancel={onCancel}
    />
  );
}

/**
 *
 */
export default function Clinician({ fhirId }: Props) {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [practitionerRolesData, setPractitionerRolesData] = useState([]);
  const [groupedByFirmAndDay, setGroupedByFirmAndDay] = useState({});
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const [selectedPractitionerRoles, setSelectedPractitionerRoles] = useState<
    PractitionerRole[]
  >([]);

  /* get practitioner's basic information*/
  const { data: profileData, isLoading: isProfileLoading } =
    useQuery<Practitioner>({
      queryKey: ['profile-data', fhirId],
      queryFn: () =>
        getProfileById(fhirId, 'Practitioner') as Promise<Practitioner>,
      onError: (error: Error) => {
        console.error('Error when fetching user profile: ', error);
        toast.error(error.message);
      }
    });

  /* get list of practitioner's roles */
  const { refetch, isLoading: isPractitionerRolesLoading } =
    useGetPractitionerRolesDetail(authState.userInfo?.fhirId, {
      onSuccess: data => {
        const resources = data?.map(entry => entry.resource) || [];
        setPractitionerRolesData(resources);
      }
    });

  useUpdatePractitionerInfo();

  const activeFirms = practitionerRolesData?.filter(firm => firm.active);

  const handleOpenDrawer = () => {
    // Set all active practitioner roles for the editor
    setSelectedPractitionerRoles(activeFirms || []);
    setIsDrawerOpen(true);
  };

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    timeSlot: any,
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
        fromTime: timeSlot.availableStartTime,
        toTime: timeSlot.availableEndTime
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role.availableTime.forEach((timeSlot: any) => {
          processTimeSlot(timeSlot, organizationName, newGroupedByFirmAndDay);
        });
      }
    });

    setGroupedByFirmAndDay(newGroupedByFirmAndDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practitionerRolesData]);

  /** Handle successful availability save and refetch roles. */
  const handleSaveSuccess = async () => {
    try {
      toast.success('Jadwal berhasil disimpan');
      setIsDrawerOpen(false);
      await refetch();
    } catch (error) {
      toast.error('Gagal menyimpan jadwal');
      console.log('Error when updating availability schedules : ', error);
    }
  };

  const age = profileData?.birthDate
    ? `${format(new Date(profileData?.birthDate), 'dd-MM-yyyy')} (${findAge(profileData.birthDate)})`
    : '-';
  const gender = profileData?.gender
    ? profileData.gender.charAt(0).toUpperCase() +
      profileData.gender.slice(1).toLowerCase()
    : '-';
  const phone =
    profileData && Array.isArray(profileData.telecom)
      ? profileData.telecom.find(item => item.system === 'phone')?.value || '-'
      : '-';
  const address =
    profileData && Array.isArray(profileData.address)
      ? mapAddress(profileData.address)
      : '-';

  const profileDetail = [
    {
      key: 'Birth(Age)',
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
            initials={initials}
            backgroundColor={backgroundColor}
            seed={seed}
            iconUrl={profileData?.photo?.[0].url}
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
        onEditSchedule={handleOpenDrawer}
      />

      <ClinicianUnavailabilityCard />

      <Settings menus={settingMenus} />

      <Drawer onClose={() => setIsDrawerOpen(false)} open={isDrawerOpen}>
        <DrawerContent className='mx-auto flex max-h-screen max-w-screen-sm flex-col overflow-y-hidden px-4 py-1'>
          <DrawerTitle />
          <DrawerDescription />
          <div className='scrollbar-hide my-2 flex-grow overflow-y-auto'>
            <DrawerBody
              selectedPractitionerRoles={selectedPractitionerRoles}
              onSave={handleSaveSuccess}
              onCancel={() => setIsDrawerOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
