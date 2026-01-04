'use client';

import CardLoader from '@/components/general/card-loader';
import ContentWraper from '@/components/general/content-wraper';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import LoadingSpinnerIcon from '@/components/icons/loading-spinner-icon';
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
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ClinicFilter from './clinic-filter';

const now = new Date();

export default function Clinic() {
  const router = useRouter();
  const [clinicFilter, setClinicFilter] = useState<IUseClinicParams>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [serverSearchTerm, setServerSearchTerm] = useState<string>('');
  const [isServerSearching, setIsServerSearching] = useState<boolean>(false);
  const [showServerResults, setShowServerResults] = useState<boolean>(false);

  const {
    data: clinics,
    isLoading: isListClinicsLoading,
    isFetching: isFetchingClinics
  } = useListClinics(
    {
      cityFilter: clinicFilter.city,
      nameFilter: serverSearchTerm
    },
    500
  );

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

  const filteredClinics = useMemo(() => {
    if (!clinics) return [];
    if (!searchTerm) return clinics;

    const regex = new RegExp(searchTerm, 'i');
    return clinics.filter(
      (clinic: BundleEntry) =>
        clinic.resource.resourceType === 'Organization' &&
        regex.test(clinic.resource.name || '')
    );
  }, [clinics, searchTerm]);

  // Effect to handle server search fallback when local search yields no results
  useEffect(() => {
    if (searchTerm && filteredClinics.length === 0) {
      setIsServerSearching(true);
      setShowServerResults(false);

      // Trigger server search after a short delay
      const timer = setTimeout(() => {
        setServerSearchTerm(searchTerm);
        setShowServerResults(true);
        setIsServerSearching(false);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (!searchTerm) {
      // Reset server search when search term is cleared
      setServerSearchTerm('');
      setShowServerResults(false);
      setIsServerSearching(false);
    }
  }, [searchTerm, filteredClinics.length]);

  const handleSelectedClinic = (clinicId: string) => {
    localStorage.setItem('selected_clinic', clinicId);
    router.push(`/clinic/${clinicId}`);
  };

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
              className='text-primary mr-4 h-[50px] w-full border-0 bg-[#F9F9F9]'
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
              <Badge className='bg-secondary mt-4 rounded-md px-4 py-[3px] font-normal text-white'>
                {clinicFilter.city}
              </Badge>
            )}
          </div>

          {isListClinicsLoading ? (
            <CardLoader />
          ) : searchTerm ? (
            // When there's a search term, show local results first, then server results if needed
            filteredClinics.length > 0 ? (
              <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
                {filteredClinics.map((clinic: BundleEntry) => (
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
                    <div className='text-primary mt-2 text-center font-bold'>
                      {clinic.resource.resourceType === 'Organization' &&
                        clinic.resource.name}
                    </div>
                    <Button
                      onClick={() => handleSelectedClinic(clinic.resource.id)}
                      className='bg-secondary mt-2 w-full rounded-[32px] py-2 font-normal text-white'
                    >
                      Check
                    </Button>
                  </div>
                ))}
              </div>
            ) : isServerSearching || isFetchingClinics ? (
              <div className='flex flex-col items-center justify-center py-16'>
                <div className='flex items-center gap-2'>
                  <LoadingSpinnerIcon />
                  <span className='text-muted'>
                    No results found, requesting more data to the server
                  </span>
                </div>
              </div>
            ) : showServerResults && clinics && clinics.length > 0 ? (
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
                    <div className='text-primary mt-2 text-center font-bold'>
                      {clinic.resource.resourceType === 'Organization' &&
                        clinic.resource.name}
                    </div>
                    <Button
                      onClick={() => handleSelectedClinic(clinic.resource.id)}
                      className='bg-secondary mt-2 w-full rounded-[32px] py-2 font-normal text-white'
                    >
                      Check
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                className='py-16'
                title='No clinics found'
                subtitle='Try a different search term or filter.'
              />
            )
          ) : clinics && clinics.length > 0 ? (
            // No search term, show all clinics
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
                  <div className='text-primary mt-2 text-center font-bold'>
                    {clinic.resource.resourceType === 'Organization' &&
                      clinic.resource.name}
                  </div>
                  <Button
                    onClick={() => handleSelectedClinic(clinic.resource.id)}
                    className='bg-secondary mt-2 w-full rounded-[32px] py-2 font-normal text-white'
                  >
                    Check
                  </Button>
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
