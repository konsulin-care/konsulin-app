'use client';

import CardLoader from '@/components/general/card-loader';
import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import NavigationBar from '@/components/navigation-bar';
import UpcomingSession from '@/components/schedule/upcoming-session';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InputWithIcon } from '@/components/ui/input-with-icon';
import { useAuth } from '@/context/auth/authContext';
import { useGetUpcomingAppointments } from '@/services/api/appointments';
import { IUseClinicParams, useListClinics } from '@/services/clinic';
import { parseMergedAppointments } from '@/utils/helper';
import { format, isAfter, parseISO } from 'date-fns';
import { BundleEntry } from 'fhir/r4';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import ClinicFilter from './clinic-filter';

const now = new Date();

export default function Clinic() {
  const [clinicFilter, setClinicFilter] = useState<IUseClinicParams>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data: clinics, isLoading: isListClinicsLoading } = useListClinics({
    searchTerm,
    cityFilter: clinicFilter.city
  });

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

  return (
    <>
      <NavigationBar />
      <Header>
        <div className='flex w-full flex-col'>
          <div className='text-[14px] font-bold text-white'>Book Session</div>
          <div className='mt-4 flex items-center justify-between'>
            <div className='text-[14px] font-bold text-white'>
              Schedule Active
            </div>
            <Link
              href={
                authState && !authState.isAuthenticated ? '/auth' : '/schedule'
              }
              className='text-[10px] text-white'
            >
              See All
            </Link>
          </div>

          {authState &&
            parsedAppointmentsData &&
            parsedAppointmentsData.length > 0 && (
              <UpcomingSession
                data={parsedAppointmentsData}
                role={authState.userInfo.role_name}
              />
            )}
        </div>
      </Header>
      <ContentWraper>
        <div className='w-full p-4'>
          <div className='flex gap-4'>
            <InputWithIcon
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder='Search'
              className='mr-4 h-[50px] w-full border-0 bg-[#F9F9F9] text-primary'
              startIcon={<SearchIcon className='text-[#ABDCDB]' width={16} />}
            />
            <ClinicFilter
              onChange={(filter: IUseClinicParams) => {
                setClinicFilter(prevState => ({
                  ...prevState,
                  ...filter
                }));
              }}
              type='clinic'
            />
          </div>

          <div className='flex gap-4'>
            {clinicFilter.city && (
              <Badge className='mt-4 rounded-md bg-secondary px-4 py-[3px] font-normal text-white'>
                {clinicFilter.city}
              </Badge>
            )}
          </div>

          {isListClinicsLoading ? (
            <CardLoader />
          ) : clinics.length > 0 ? (
            <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
              {clinics.map((clinic: BundleEntry) => (
                <div
                  key={clinic.resource.id}
                  className='card flex flex-col items-center'
                >
                  <Image
                    className='h-[100px] w-full rounded-lg object-cover'
                    src='/images/clinic.jpg'
                    alt='clinic'
                    width={158}
                    height={100}
                  />
                  <div className='mt-2 text-center font-bold text-primary'>
                    {clinic.resource.resourceType === 'Organization' &&
                      clinic.resource.name}
                  </div>
                  <Link
                    href={`/clinic/${clinic.resource.id}`}
                    className='w-full'
                  >
                    <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 font-normal text-white'>
                      Check
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState className='py-16' />
          )}
        </div>
      </ContentWraper>
    </>
  );
}
