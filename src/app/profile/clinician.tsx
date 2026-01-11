'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import InformationDetail from '@/components/profile/information-detail';
import MedalCollection from '@/components/profile/medal-collection';
import Settings from '@/components/profile/settings';
import Tags from '@/components/profile/tags';
import MarkUnavailabilityButton from '@/components/schedule/mark-unavailability';
import UpcomingSession from '@/components/schedule/upcoming-session';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { medalLists, settingMenus } from '@/constants/profile';
import { useAuth } from '@/context/auth/authContext';
import { useGetUpcomingSessions } from '@/services/api/appointments';
import {
  useGetPractitionerRolesDetail,
  useUpdatePractitionerInfo
} from '@/services/clinicians';
import { getProfileById } from '@/services/profile';
import {
  findAge,
  generateAvatarPlaceholder,
  mapAddress,
  parseMergedSessions
} from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import { format, isAfter, parseISO } from 'date-fns';
import { Practitioner, PractitionerRole } from 'fhir/r4';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import PractitionerAvailabilityEditor from '../practitioner/practitioner-availability-editor';

type Props = {
  fhirId: string;
};

const now = new Date();

/**
 * Renders the clinician profile page including upcoming sessions, general and practice information, availability overview, and an availability editor drawer.
 *
 * Displays practitioner's upcoming sessions, basic profile details, practice information, availability grouped by organization and day, and controls to edit availability (per-day collapsible editors with time ranges). Handles data fetching, form state for availability editing, validation, and saving changes.
 *
 * @param fhirId - The practitioner's FHIR resource ID used to fetch profile and role data.
 * @returns The JSX element for the Clinician profile page.
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

  /* get practitioner's upcoming sessions*/
  const { data: sessionData, isLoading: isUpcomingSessionsLoading } =
    useGetUpcomingSessions({
      practitionerId: authState.userInfo.fhirId,
      dateReference: format(now, 'yyyy-MM-dd')
    });

  const parsedSessionsData = useMemo(() => {
    if (!sessionData || sessionData?.total === 0 || !authState.isAuthenticated)
      return null;

    const parsed = parseMergedSessions(sessionData);
    const filtered = parsed.filter(session => {
      const slotStart = parseISO(session.slotStart);
      return isAfter(slotStart, now);
    });

    return filtered;
  }, [sessionData, authState]);

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
    useGetPractitionerRolesDetail(authState.userInfo.fhirId, {
      onSuccess: data => {
        const resources = data?.map(entry => entry.resource) || [];
        setPractitionerRolesData(resources);
      }
    });

  const {
    mutateAsync: updatePractitionerInfo,
    isLoading: isUpdatePractitionerLoading
  } = useUpdatePractitionerInfo();

  const activeFirms = practitionerRolesData?.filter(firm => firm.active);

  const handleOpenDrawer = () => {
    // Set all active practitioner roles for the editor
    if (activeFirms && activeFirms.length > 0) {
      setSelectedPractitionerRoles(activeFirms);
    }
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
  useEffect(() => {
    if (!Array.isArray(activeFirms)) return;

    const newGroupedByFirmAndDay = {};

    activeFirms.forEach(role => {
      const organizationName = role?.organizationData.name || '';

      if (Array.isArray(role.availableTime)) {
        role.availableTime.forEach((timeSlot: any) => {
          if (Array.isArray(timeSlot.daysOfWeek)) {
            timeSlot.daysOfWeek.forEach((day: string) => {
              const dayKey = day.charAt(0).toUpperCase() + day.slice(1);

              if (!newGroupedByFirmAndDay[organizationName]) {
                newGroupedByFirmAndDay[organizationName] = {
                  availability: {}
                };
              }

              if (
                !newGroupedByFirmAndDay[organizationName].availability[dayKey]
              ) {
                newGroupedByFirmAndDay[organizationName].availability[dayKey] =
                  [];
              }

              newGroupedByFirmAndDay[organizationName].availability[
                dayKey
              ].push({
                fromTime: timeSlot.availableStartTime,
                toTime: timeSlot.availableEndTime
              });
            });
          }
        });
      }
    });

    setGroupedByFirmAndDay(newGroupedByFirmAndDay);
  }, [practitionerRolesData]);

  const organizationWithPrice = Array.isArray(activeFirms)
    ? activeFirms.filter(role => {
        return (
          role.invoiceData?.totalNet &&
          typeof role.invoiceData.totalNet.value === 'number' &&
          role.invoiceData.totalNet.value > 0
        );
      })
    : [];

  const firms = organizationWithPrice.map(item => ({
    roleId: item.id,
    code: item.organizationData.id,
    name: item.organizationData.name
  }));

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

  const age =
    profileData && profileData.birthDate
      ? `${format(new Date(profileData?.birthDate), 'dd-MM-yyyy')} (${findAge(profileData.birthDate)})`
      : '-';
  const gender =
    profileData && profileData.gender
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

  const { initials, backgroundColor } = generateAvatarPlaceholder({
    id: authState.userInfo?.fhirId,
    name: authState.userInfo?.fullname,
    email: authState.userInfo?.email
  });

  const displayName =
    !authState.userInfo.fullname || authState.userInfo.fullname.trim() === '-'
      ? authState.userInfo.email
      : authState.userInfo.fullname;

  const hasData = Object.keys(groupedByFirmAndDay).length > 0;

  return (
    <>
      {/* display practitioner's upcoming sessions */}
      <div className='text-muted flex items-center justify-between'>
        <div className='text-[14px] font-bold'>Schedule Active</div>
        <Link href='/schedule' className='text-[10px]'>
          See All
        </Link>
      </div>

      {isUpcomingSessionsLoading || isAuthLoading ? (
        <Skeleton className='mt-4 h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      ) : authState && parsedSessionsData && parsedSessionsData.length > 0 ? (
        <UpcomingSession
          data={parsedSessionsData}
          role={authState.userInfo.role_name}
        />
      ) : null}

      {/* display practitioner's basic information */}
      {isProfileLoading || isAuthLoading ? (
        <Skeleton className='my-4 h-[200px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      ) : (
        <div className='my-4'>
          <InformationDetail
            isRadiusIcon
            initials={initials}
            backgroundColor={backgroundColor}
            iconUrl={profileData?.photo?.[0].url}
            title='General Information'
            subTitle={displayName}
            buttonText='Edit Profile'
            details={profileDetail}
            onEdit={() => router.push('profile/edit-profile')}
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
          onEdit={() => router.push('profile/edit-practice')}
          role='clinician'
          isEditPractice={true}
        />
      )}

      {/* display practitioner's availability schedules */}
      <div
        className={`mt-4 flex flex-col items-start justify-start rounded-[16px] bg-[#F9F9F9] ${hasData ? 'pt-4' : 'pt-0'}`}
      >
        <div className='w-full px-4'>
          {Object.keys(groupedByFirmAndDay).map((firm, index) => {
            const availability = groupedByFirmAndDay[firm].availability;
            return (
              <div key={index}>
                <div className='mb-2 text-start font-bold'>{firm}</div>
                {Object.keys(availability).map(day => {
                  const timeRanges = availability[day] || [];
                  const tags = timeRanges.map(
                    (timeRange: any) =>
                      `${day}: ${timeRange.fromTime} - ${timeRange.toTime}`
                  );

                  return (
                    <div
                      key={`${firm}-${day}`}
                      className='mb-4 flex w-full flex-wrap gap-[10px]'
                    >
                      <Tags tags={tags} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className='flex w-full flex-col justify-between rounded-[16px] border-0 bg-[#F9F9F9] p-4'>
          <div
            className='flex cursor-pointer items-center justify-between'
            onClick={handleOpenDrawer}
          >
            <Image
              src={'/icons/calendar-profile.svg'}
              width={30}
              height={30}
              alt='calendar-icon'
              className='pr-[13px]'
            />
            <p className='flex-grow text-start text-xs font-bold text-[#2C2F35]'>
              Edit Availability Schedule
            </p>
            <ChevronRight color='#13C2C2' width={24} height={24} />
          </div>
        </div>

        <div className='mt-2 flex w-full flex-col justify-between rounded-[16px] border-0 bg-[#F9F9F9] p-4'>
          <MarkUnavailabilityButton />
        </div>
      </div>
      <MedalCollection medals={medalLists} isDisabled={true} />
      <Settings menus={settingMenus} />

      <Drawer onClose={() => setIsDrawerOpen(false)} open={isDrawerOpen}>
        <DrawerContent className='mx-auto flex max-h-screen max-w-screen-sm flex-col overflow-y-hidden px-4 py-1'>
          <DrawerTitle />
          <DrawerDescription />
          <div className='scrollbar-hide my-2 flex-grow overflow-y-auto'>
            {selectedPractitionerRoles &&
            selectedPractitionerRoles.length > 0 ? (
              <PractitionerAvailabilityEditor
                practitionerRoles={selectedPractitionerRoles}
                onSuccess={handleSaveSuccess}
                onCancel={() => setIsDrawerOpen(false)}
              />
            ) : (
              <div className='flex h-full items-center justify-center'>
                <LoadingSpinnerIcon
                  width={50}
                  height={50}
                  className='animate-spin'
                />
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
