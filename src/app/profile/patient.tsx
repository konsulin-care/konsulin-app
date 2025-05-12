'use client';

import InformationDetail from '@/components/profile/information-detail';
import MedalCollection from '@/components/profile/medal-collection';
import Settings from '@/components/profile/settings';
import UpcomingSession from '@/components/schedule/upcoming-session';
import { Skeleton } from '@/components/ui/skeleton';
import { medalLists, settingMenus } from '@/constants/profile';
import { useAuth } from '@/context/auth/authContext';
import { useGetUpcomingAppointments } from '@/services/api/appointments';
import { getProfileById } from '@/services/profile';
import { mergeNames, parseMergedAppointments } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import { format, isAfter, parseISO } from 'date-fns';
import type { Address, ContactPoint, Patient } from 'fhir/r4';
import { ChevronRightIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { toast } from 'react-toastify';

type Props = {
  fhirId: string;
};

const now = new Date();

export default function Patient({ fhirId }: Props) {
  const router = useRouter();
  const { state: authState } = useAuth();
  const { data: upcomingData } = useGetUpcomingAppointments({
    patientId: authState?.userInfo?.fhirId,
    dateReference: format(now, 'yyyy-MM-dd')
  });

  const parsedAppointmentsData = useMemo(() => {
    if (!upcomingData || upcomingData?.total === 0) return null;

    const parsed = parseMergedAppointments(upcomingData);
    const filtered = parsed.filter(session => {
      const slotStart = parseISO(session.slotStart);
      return isAfter(slotStart, now);
    });

    return filtered;
  }, [upcomingData]);

  const { data: profileData, isLoading: isProfileLoading } = useQuery<Patient>({
    queryKey: ['profile-data', fhirId],
    queryFn: () => getProfileById(fhirId, 'Patient'),
    onError: (error: Error) => {
      console.error('Error when fetching user profile: ', error);
      toast.error(error.message);
    }
  });

  const findTelecom = (system: string) => {
    const found = profileData.telecom.find(
      (item: ContactPoint) => item.system === system
    );

    if (!found) return '-';

    return found.value;
  };

  const findAge = (birthDateStr: string) => {
    const birthdate = new Date(birthDateStr);
    const today = new Date();

    if (isNaN(birthdate.getTime())) {
      return '-';
    }

    let age = today.getFullYear() - birthdate.getFullYear();
    const hasHadBirthdayThisYear =
      today.getMonth() > birthdate.getMonth() ||
      (today.getMonth() === birthdate.getMonth() &&
        today.getDate() >= birthdate.getDate());

    if (!hasHadBirthdayThisYear) {
      age--;
    }

    return age;
  };

  function mapAddress(address: Address[]): string {
    if (!address || address.length === 0) return '-';

    const addr = address[0];
    const parts = [addr.line[0], addr.district, addr.city, addr.postalCode];

    return parts.filter(Boolean).join(', ');
  }

  const profileDetail = profileData
    ? [
        { key: 'Age', value: findAge(profileData.birthDate).toString() },
        { key: 'Sex', value: profileData.gender || '-' },
        { key: 'Whatsapp', value: findTelecom('phone') },
        {
          key: 'Address',
          value: mapAddress(profileData.address)
        }
      ]
    : [];

  return (
    <>
      <div className='mb-4 flex justify-between rounded-lg bg-secondary p-4'>
        <Image
          width={48}
          height={48}
          src={'/icons/diamond.svg'}
          alt='membership-premium-logo'
        />
        <div className='flex w-full flex-col items-start justify-start pl-2'>
          <div className='flex flex-grow items-start pb-[2px]'>
            <p className='mb-1 text-left text-sm font-bold text-white'>
              Membership Premium
            </p>
            <div className='ml-4 flex h-6 w-[100px] flex-grow items-center justify-center space-x-1 rounded-full bg-white py-2'>
              <Image
                width={12}
                height={9}
                src={'/icons/diamond-small.svg'}
                alt='membership-premium-logo'
              />
              <p className='text-black-100 whitespace-nowrap pl-1 text-[10px] font-semibold'>
                150 Points
              </p>
            </div>
          </div>
          <div className='w-full'>
            <p className='text-left text-[10px] text-white opacity-75'>
              Tergabung Sejak 2019
            </p>
          </div>
        </div>
        <div className='flex items-start justify-center'>
          <ChevronRightIcon color='white' width={24} height={24} />
        </div>
      </div>
      {isProfileLoading || !profileData ? (
        <Skeleton className='h-[200px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      ) : (
        <InformationDetail
          isRadiusIcon
          iconUrl={
            profileData.photo?.[0].url && profileData.photo[0].url !== ''
              ? profileData.photo[0].url
              : '/images/sample-foto.svg'
          }
          title={mergeNames(profileData.name)}
          subTitle={findTelecom('email')}
          buttonText='Edit Profile'
          details={profileDetail}
          onEdit={() => router.push('profile/edit-profile')}
          role='patient'
        />
      )}

      <MedalCollection medals={medalLists} isDisabled={true} />

      <div className='mt-4 flex items-center justify-between text-muted'>
        <div className='text-[14px] font-bold'>Schedule Active</div>
        <Link href='/schedule' className='text-[10px]'>
          See All
        </Link>
      </div>

      {parsedAppointmentsData && parsedAppointmentsData.length > 0 ? (
        <UpcomingSession upcomingData={parsedAppointmentsData} />
      ) : (
        <Skeleton className='mt-4 h-[80px] w-full rounded-lg bg-[hsl(210,40%,96.1%)]' />
      )}

      <Settings menus={settingMenus} />
    </>
  );
}
