'use client';

import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import { getFromLocalStorage } from '@/lib/utils';
import { useDetailPractitioner } from '@/services/clinic';
import { generateAvatarPlaceholder, mergeNames } from '@/utils/helper';
import { CodeableConcept } from 'fhir/r4';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  HospitalIcon
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import PractitionerAvailbility from '../practitioner-availbility';

export interface IPractitionerProps {
  params: { practitionerId: string };
}

export default function Practitioner({ params }: IPractitionerProps) {
  const { state: authState } = useAuth();
  const router = useRouter();
  const { state: bookingState } = useBooking();

  const practitionerData = JSON.parse(
    getFromLocalStorage(`practitioner-${params.practitionerId}`)
  );

  const {
    newData: detailPractitioner,
    isLoading,
    isError,
    isFetching
  } = useDetailPractitioner(practitionerData?.roleId);

  const displayName = useMemo(() => {
    const name = mergeNames(
      practitionerData?.name,
      practitionerData?.qualification
    );

    return name;
  }, [practitionerData]);

  const handleBookingSession = () => {
    if (bookingState.scheduleId) {
      router.push(`/practitioner/${params.practitionerId}/book-practitioner`);
    }
  };

  const { initials, backgroundColor } = generateAvatarPlaceholder({
    name: displayName,
    email: practitionerData.email
  });

  return (
    <>
      <Header>
        <div className='flex w-full items-center'>
          <ChevronLeftIcon
            onClick={() => router.back()}
            color='white'
            className='mr-2 cursor-pointer'
          />
          <div className='text-[14px] font-bold text-white'>
            Detail Practitioner
          </div>
        </div>
      </Header>

      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        {!practitionerData || isError ? (
          <EmptyState
            className='py-16'
            title='Practitioner Not Found'
            subtitle='Please return to the clinic page and select a practitioner.'
          />
        ) : isLoading || isFetching ? (
          <div className='flex min-h-screen min-w-full items-center justify-center'>
            <LoadingSpinnerIcon
              width={56}
              height={56}
              className='w-full animate-spin'
            />
          </div>
        ) : (
          <>
            <div className='flex flex-col items-center'>
              <div className='flex flex-col items-center'>
                {practitionerData.photo && practitionerData.photo[0].url ? (
                  <Image
                    className='h-[100px] w-[100px] rounded-full object-cover'
                    src={practitionerData.photo[0].url}
                    alt='practitioner'
                    width={100}
                    height={100}
                    unoptimized
                  />
                ) : (
                  <div
                    className='flex h-[100px] w-[100px] items-center justify-center rounded-full text-2xl font-bold text-white'
                    style={{ backgroundColor }}
                  >
                    {initials}
                  </div>
                )}

                <Badge className='mt-[-15px] flex min-h-[24px] min-w-[100px] bg-[#08979C] text-center font-normal text-white'>
                  {detailPractitioner.organization.name}
                </Badge>
              </div>
              <h3 className='mt-2 text-center text-[20px] font-bold'>
                {displayName}
              </h3>
            </div>

            <PractitionerAvailbility
              practitionerRole={detailPractitioner.resource}
            >
              <div className='card mt-4 flex cursor-pointer items-center border-0 bg-[#F9F9F9] p-4'>
                <CalendarDaysIcon size={24} color='#13C2C2' className='mr-2' />
                <span className='mr-auto text-[12px] font-bold'>
                  See Availbility
                </span>
                <ArrowRightIcon color='#13C2C2' />
              </div>
            </PractitionerAvailbility>

            <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9] p-4'>
              <div className='flex items-center'>
                <HospitalIcon size={24} color='#13C2C2' className='mr-2' />
                <span className='text-[12px] font-bold'>
                  Practice Information
                </span>
              </div>
              <div className='mt-4 flex flex-col space-y-2'>
                <div className='flex justify-between text-[12px]'>
                  <span className='mr-2'>Affiliation</span>
                  <span className='font-bold'>
                    {detailPractitioner.organization.name}
                  </span>
                </div>
                {/* NOTE: not provided by api */}
                {/* <div className='flex justify-between text-[12px]'> */}
                {/*   <span className='mr-2'>Experience</span> */}
                {/*   <span className='font-bold'>2 Year</span> */}
                {/* </div> */}
                <div className='flex justify-between text-[12px]'>
                  <span className='mr-2'>Fee</span>
                  <span className='font-bold'>
                    {detailPractitioner.invoice?.totalNet
                      ? `${new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency:
                            detailPractitioner.invoice.totalNet.currency,
                          minimumFractionDigits: 0
                        }).format(
                          detailPractitioner.invoice.totalNet.value
                        )} / Session`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>

            {detailPractitioner.resource.specialty && (
              <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9]'>
                <div className='flex items-center'>
                  <HospitalIcon size={32} color='#13C2C2' className='mr-2' />
                  <span className='text-[12px] font-bold'>Specialty</span>
                </div>

                <div className='mt-4 flex flex-wrap gap-2'>
                  {detailPractitioner.resource.specialty.length > 0 &&
                    detailPractitioner.resource.specialty.map(
                      (specialty: CodeableConcept, index: number) => (
                        <Badge
                          key={index}
                          className='bg-[#E1E1E1] px-2 py-[2px] font-normal'
                        >
                          {specialty.text}
                        </Badge>
                      )
                    )}
                </div>
              </div>
            )}

            {authState.isAuthenticated ? (
              /* disable booking session button if user hasn’t set date and time. */
              <Button
                onClick={handleBookingSession}
                disabled={!bookingState.scheduleId}
                className='mt-auto w-full rounded-[32px] bg-secondary py-2 text-[14px] font-bold text-white'
              >
                Book Session
              </Button>
            ) : (
              <Link href={'/auth'} className='mt-auto w-full'>
                <Button className='mt-2 w-full rounded-[32px] bg-secondary py-2 text-[14px] font-bold text-white'>
                  Silakan Daftar atau Masuk untuk Booking
                </Button>
              </Link>
            )}
          </>
        )}
      </div>
    </>
  );
}
