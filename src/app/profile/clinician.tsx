'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import Collapsible from '@/components/profile/collapsible';
import DropdownProfile from '@/components/profile/dropdown-profile';
import InformationDetail from '@/components/profile/information-detail';
import MedalCollection from '@/components/profile/medal-collection';
import Settings from '@/components/profile/settings';
import Tags from '@/components/profile/tags';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { medalLists, settingMenus } from '@/constants/profile';
import { useAuth } from '@/context/auth/authContext';
import {
  useGetPractitionerRolesDetail,
  useUpdatePractitionerInfo
} from '@/services/clinicians';
import { getProfileById } from '@/services/profile';
import { findAge, generateAvatarPlaceholder, mapAddress } from '@/utils/helper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ContactPoint,
  Practitioner,
  PractitionerRoleAvailableTime
} from 'fhir/r4';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { daysOfWeek } from './constants';
import { FormsState, TimeRange } from './types';
import {
  handleAddForm,
  handleOrganizationChange,
  handlePayloadSend,
  handleRemoveTimeRange,
  handleTimeChange,
  validateTimeRanges
} from './utils';

type Props = {
  fhirId: string;
};

export default function Clinician({ fhirId }: Props) {
  const router = useRouter();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [practitionerRolesData, setPractitionerRolesData] = useState([]);
  const [formsState, setFormsState] = useState<FormsState>(
    daysOfWeek.reduce((acc, day) => {
      acc[day] = [];
      return acc;
    }, {} as FormsState)
  );
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>(
    {}
  );
  const [groupedByFirmAndDay, setGroupedByFirmAndDay] = useState({});
  const { state: authState, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  /* get practitioner's basic information*/
  const { data: profileData, isLoading: isProfileLoading } =
    useQuery<Practitioner>({
      queryKey: ['profile-data', fhirId],
      queryFn: () => getProfileById(fhirId, 'Practitioner'),
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
    const initialFormsState = daysOfWeek.reduce((acc, day) => {
      acc[day] = [];
      return acc;
    }, {} as FormsState);

    setFormsState(initialFormsState);

    const updatedFormsState = { ...initialFormsState };
    if (Array.isArray(practitionerRolesData)) {
      const dayMapping = {
        mon: 'Monday',
        tue: 'Tuesday',
        wed: 'Wednesday',
        thu: 'Thursday',
        fri: 'Friday',
        sat: 'Saturday',
        sun: 'Sunday'
      };

      activeFirms.forEach(role => {
        const organizationName = role?.organizationData.name || '';
        const organizationId = role?.organizationData.id || '';

        role.availableTime?.forEach(
          (timeSlot: PractitionerRoleAvailableTime) => {
            timeSlot.daysOfWeek.forEach(shortDay => {
              const fullDayName = dayMapping[shortDay];
              if (fullDayName) {
                updatedFormsState[fullDayName].push({
                  times: [
                    {
                      roleId: role.id,
                      code: organizationId,
                      name: organizationName,
                      fromTime: timeSlot.availableStartTime,
                      toTime: timeSlot.availableEndTime
                    }
                  ]
                });
              }
            });
          }
        );
      });
      setFormsState(updatedFormsState);
    } else {
      console.error('activeFirms is not an array');
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
        role.availableTime.forEach(
          (timeSlot: PractitionerRoleAvailableTime) => {
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
                  newGroupedByFirmAndDay[organizationName].availability[
                    dayKey
                  ] = [];
                }

                newGroupedByFirmAndDay[organizationName].availability[
                  dayKey
                ].push({
                  fromTime: timeSlot.availableStartTime,
                  toTime: timeSlot.availableEndTime
                });
              });
            }
          }
        );
      }
    });

    setGroupedByFirmAndDay(prevState => ({
      ...prevState,
      ...newGroupedByFirmAndDay
    }));
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

  const handleSave = async () => {
    if (activeDayIndex === null) return;

    const day = daysOfWeek[activeDayIndex];
    const allTimes = formsState[day].flatMap(form => form.times);

    const hasEmptyFirm = allTimes.some(
      time => time.code === '' || time.code === null
    );

    const errorMessage = validateTimeRanges(allTimes);
    if (hasEmptyFirm) {
      setErrorMessages(prev => ({
        ...prev,
        [day]: 'Harap isi form dengan benar'
      }));
      return;
    }

    if (errorMessage) {
      setErrorMessages(prev => ({ ...prev, [day]: errorMessage }));
      return;
    }

    const payloads = handlePayloadSend(practitionerRolesData, formsState);

    try {
      await Promise.all(
        payloads.map(payload => updatePractitionerInfo(payload))
      );
      toast.success('Jadwal berhasil disimpan');
      setIsDrawerOpen(false);
      await refetch();
    } catch (error) {
      toast.error('Gagal menyimpan jadwal');
      console.log('Error when updating availability schedules : ', error);
    }
  };

  const findTelecom = (system: string) => {
    const found = profileData.telecom.find(
      (item: ContactPoint) => item.system === system
    );

    if (!found) return '-';

    return found.value;
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
      ? findTelecom('phone')
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
      {/* TODO: add schedule active information here */}

      {/* display practitioner's basic information */}
      {isProfileLoading || isAuthLoading || !profileData ? (
        <Skeleton className='h-[200px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      ) : (
        <div className='mb-4'>
          <InformationDetail
            isRadiusIcon
            initials={initials}
            backgroundColor={backgroundColor}
            iconUrl={profileData.photo?.[0].url}
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
          onEdit={() => router.push('profile/edit-pratice')}
          role='clinician'
          isEditPratice={true}
        />
      )}

      {/* display practitioner's availability schedules */}
      <div
        className={`mt-4 flex flex-col items-start justify-start rounded-[16px] bg-[#F9F9F9] ${hasData ? 'pt-4' : 'pt-0'}`}
      >
        <div className='w-full px-4'>
          {Object.keys(groupedByFirmAndDay).map((firm, index) => (
            <div key={index}>
              <div className='mb-2 text-start font-bold'>{firm}</div>
              {groupedByFirmAndDay[firm].availability &&
                Object.keys(groupedByFirmAndDay[firm].availability).map(day => {
                  const timeRanges =
                    groupedByFirmAndDay[firm].availability[day] || [];
                  const tags = timeRanges.map(
                    (timeRange: TimeRange) =>
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
          ))}
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
      </div>
      <MedalCollection medals={medalLists} isDisabled={true} />
      <Settings menus={settingMenus} />

      <Drawer onClose={() => setIsDrawerOpen(false)} open={isDrawerOpen}>
        <div className='max-h-screen'>
          <DrawerContent className='mx-auto flex max-h-screen max-w-screen-sm flex-col overflow-y-hidden px-4 py-1'>
            <DrawerTitle />
            <DrawerDescription />
            <div className='my-2 flex-grow overflow-y-auto'>
              {daysOfWeek.map((day, dayIndex) => {
                const checkSchedule = formsState[day]?.some(form =>
                  form.times.some(
                    time => time.fromTime !== '--:--' && time.toTime !== '--:--'
                  )
                );

                const hasFirms = firms.length > 0;

                return (
                  <Collapsible
                    key={day}
                    day={day}
                    isOpen={activeDayIndex === dayIndex}
                    onToggle={() =>
                      setActiveDayIndex(
                        activeDayIndex === dayIndex ? null : dayIndex
                      )
                    }
                    hasSchedules={checkSchedule && hasFirms}
                  >
                    {hasFirms && formsState[day]?.length > 0 ? (
                      formsState[day].map((form, formIndex) => (
                        <div key={`${day}-${formIndex}`}>
                          {form.times.map((time, timeIndex) => (
                            <div
                              key={`${day}-${formIndex}-${timeIndex}`}
                              className='flex w-full items-start justify-between py-2'
                            >
                              <div className='flex flex-grow flex-col items-center'>
                                <DropdownProfile
                                  options={firms}
                                  value={time.code}
                                  onSelect={value => {
                                    handleOrganizationChange(
                                      formsState,
                                      day,
                                      formIndex,
                                      timeIndex,
                                      value,
                                      setFormsState,
                                      setErrorMessages
                                    );
                                  }}
                                  placeholder='Choose your firm'
                                />
                                <div className='flex w-full items-center justify-between'>
                                  <div className='flex items-center justify-center pl-1'>
                                    <span className='text-sm font-medium'>
                                      From
                                    </span>
                                    <input
                                      type='time'
                                      className='block w-full rounded-lg bg-gray-50 p-2.5 text-sm text-gray-900 focus:outline-none dark:bg-gray-700 dark:text-white'
                                      value={time.fromTime.slice(0, 5)} // display hh:mm instead of hh:mm:ss
                                      onChange={e =>
                                        handleTimeChange(
                                          day,
                                          formIndex,
                                          timeIndex,
                                          'from',
                                          e.target.value,
                                          formsState,
                                          setFormsState,
                                          setErrorMessages
                                        )
                                      }
                                      required
                                    />
                                  </div>
                                  <div className='flex w-3 flex-grow' />
                                  <div className='flex items-center justify-end'>
                                    <span className='text-sm font-medium'>
                                      To
                                    </span>
                                    <input
                                      type='time'
                                      className='block w-full rounded-lg bg-gray-50 p-2.5 text-sm text-gray-900 focus:outline-none dark:bg-gray-700 dark:text-white'
                                      value={time.toTime.slice(0, 5)}
                                      onChange={e =>
                                        handleTimeChange(
                                          day,
                                          formIndex,
                                          timeIndex,
                                          'to',
                                          e.target.value,
                                          formsState,
                                          setFormsState,
                                          setErrorMessages
                                        )
                                      }
                                      required
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className='flex flex-col items-center pl-4 pt-4'>
                                <Trash2
                                  size={20}
                                  className='cursor-pointer'
                                  onClick={() =>
                                    handleRemoveTimeRange(
                                      day,
                                      formIndex,
                                      timeIndex,
                                      formsState,
                                      setFormsState,
                                      setErrorMessages
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className='flex w-full items-center justify-center py-2 text-gray-500'>
                        {hasFirms
                          ? `No schedules available for ${day}.`
                          : `No firms available for ${day}.`}
                      </div>
                    )}
                    <div className='flex w-full items-center justify-end'>
                      {errorMessages[day] && (
                        <div className='px-2 text-sm text-red-500'>
                          {errorMessages[day]}
                        </div>
                      )}
                      <div className='m-4 mx-2 h-[30px] w-[30px] rounded-2xl bg-secondary'>
                        <Plus
                          color='white'
                          size={30}
                          className='cursor-pointer'
                          onClick={() =>
                            handleAddForm(
                              day,
                              formsState,
                              setFormsState,
                              setErrorMessages
                            )
                          }
                        />
                      </div>
                      <Button
                        className='w-[80px] bg-[#E1E1E1] font-bold text-[#2C2F35]'
                        onClick={handleSave}
                        disabled={isUpdatePractitionerLoading}
                      >
                        {isUpdatePractitionerLoading ? (
                          <LoadingSpinnerIcon
                            width={20}
                            height={20}
                            stroke='white'
                            className='w-full animate-spin'
                          />
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </DrawerContent>
        </div>
      </Drawer>
    </>
  );
}
