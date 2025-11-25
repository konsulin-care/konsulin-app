'use client';

import Avatar from '@/components/general/avatar';
import BackButton from '@/components/general/back-button';
import EmptyState from '@/components/general/empty-state';
import Header from '@/components/header';
import { LoadingSpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from '@/components/ui/drawer';
import { useBooking } from '@/context/booking/bookingContext';
import { getFromLocalStorage } from '@/lib/utils';
import { useDetailPractitioner } from '@/services/clinic';
import { generateAvatarPlaceholder, mergeNames } from '@/utils/helper';
import {
  Attachment,
  CodeableConcept,
  HumanName,
  PractitionerQualification
} from 'fhir/r4';
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  HeartPulse,
  HospitalIcon
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import PractitionerAvailability from '../practitioner-availability';

export interface IPractitionerProps {
  params: { practitionerId: string };
}

type IPractitionerLocalStorage = {
  roleId: string;
  name: HumanName[];
  photo: Attachment[];
  qualification: PractitionerQualification[];
  email: string;
};

/**
 * Render the practitioner detail page showing practitioner information, availability controls, and a booking-success drawer.
 *
 * This component reads selected clinic and practitioner data from localStorage, fetches detailed practitioner data, and manages booking feedback via a confirmation drawer. It also computes avatar placeholders and formats practice information for display.
 *
 * @param params - Route parameters object containing `practitionerId`
 * @returns A React element that displays practitioner details, availability interaction, and a booking confirmation drawer
 */
export default function Practitioner({ params }: IPractitionerProps) {
  const router = useRouter();
  const { state: bookingState, dispatch } = useBooking();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [practitionerData, setPractitionerData] =
    useState<IPractitionerLocalStorage>();
  const [practitionerDataLoading, setPractitionerDataLoading] = useState(true);

  useEffect(() => {
    const clinicId = getFromLocalStorage('selected_clinic');

    if (clinicId) {
      setSelectedClinicId(clinicId);
    } else {
      router.push('/clinic');
    }
  }, []);

  useEffect(() => {
    const fetchPractitionerData = () => {
      if (!params.practitionerId) return;

      const raw = getFromLocalStorage('selected_practitioner');
      const parsed = raw ? JSON.parse(raw) : null;

      setPractitionerData(parsed);
      setPractitionerDataLoading(false);
    };

    fetchPractitionerData();
  }, [params.practitionerId]);

  useEffect(() => {
    if (bookingState.isBookingSubmitted) {
      setIsOpen(true);
      dispatch({ type: 'RESET_BOOKING_INFO' });
    }
  }, [bookingState.isBookingSubmitted]);

  const {
    newData: detailPractitioner,
    isLoading,
    isError,
    isFetching
  } = useDetailPractitioner(practitionerData?.roleId);

  const handleClose = () => {
    startTransition(() => {
      router.push('/');
    });
  };

  const displayName = useMemo(() => {
    const name = mergeNames(
      practitionerData?.name,
      practitionerData?.qualification
    );

    return name;
  }, [practitionerData]);

  const { initials, backgroundColor } = generateAvatarPlaceholder({
    id: params.practitionerId,
    name: displayName,
    email: practitionerData?.email
  });

  const photoUrl = practitionerData?.photo?.[0]?.url;

  const renderDrawerContent = (
    <>
      <DrawerHeader className='mx-auto flex flex-col items-center gap-4 pb-0 text-[20px]'>
        <Image
          className='rounded-[8px] object-cover p-6'
          src={'/images/booking-success.png'}
          height={0}
          width={200}
          style={{ width: 'auto', height: 'auto' }}
          alt='success'
        />
        <DrawerTitle className='mb-2 text-center text-2xl font-bold'>
          Selamat! Anda Telah Berhasil Memesan Sesi Konsultasi
        </DrawerTitle>
      </DrawerHeader>

      <DrawerDescription className='px-4 text-center text-sm opacity-50'>
        Pemesanan Anda telah berhasil, dan kami telah mencatat detail sesi
        konsultasi Anda
      </DrawerDescription>

      <DrawerFooter className='mt-2 flex flex-col gap-4 text-gray-600'>
        <Button
          className='bg-secondary h-full w-full rounded-xl p-4 text-white'
          onClick={handleClose}
          disabled={isPending}
        >
          {isPending ? (
            <LoadingSpinnerIcon
              stroke='white'
              width={20}
              height={20}
              className='animate-spin'
            />
          ) : (
            'Close'
          )}
        </Button>
      </DrawerFooter>
    </>
  );

  const LoadingState = () => (
    <div className='flex min-h-screen min-w-full items-center justify-center'>
      <LoadingSpinnerIcon
        width={56}
        height={56}
        className='w-full animate-spin'
      />
    </div>
  );

  const EmptyPractitionerState = () => (
    <EmptyState
      className='py-16'
      title='Practitioner Not Found'
      subtitle='Please return to the clinic page and select a practitioner.'
    />
  );

  return (
    <>
      <Header>
        <div className='flex w-full items-center'>
          <BackButton route={`/clinic/${selectedClinicId}`} />
          <div className='text-[14px] font-bold text-white'>
            Detail Practitioner
          </div>
        </div>
      </Header>

      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        {practitionerDataLoading ? (
          <LoadingState />
        ) : !practitionerData ? (
          <EmptyPractitionerState />
        ) : isLoading || isFetching ? (
          <LoadingState />
        ) : !detailPractitioner || isError ? (
          <EmptyPractitionerState />
        ) : (
          <>
            <div className='flex flex-col items-center'>
              <div className='flex flex-col items-center'>
                <Avatar
                  initials={initials}
                  backgroundColor={backgroundColor}
                  photoUrl={photoUrl}
                  className='text-2xl'
                />

                <Badge className='mt-[-15px] flex min-h-[24px] min-w-[100px] justify-center gap-1 bg-[#08979C] font-normal text-white'>
                  <HeartPulse size={16} color='#08979C' fill='white' />
                  <span className='whitespace-nowrap'>
                    {detailPractitioner.organization.name}
                  </span>
                </Badge>
              </div>
              <h3 className='mt-2 text-center text-[20px] font-bold'>
                {displayName}
              </h3>
            </div>

            <PractitionerAvailability
              practitionerRole={detailPractitioner.resource}
              scheduleId={detailPractitioner?.schedule?.id}
              invoice={detailPractitioner.invoice}
              practitionerName={displayName}
              practitionerOrganizationName={
                detailPractitioner.organization.name
              }
              practitionerAvatar={{
                photoUrl: photoUrl,
                initials,
                backgroundColor
              }}
            >
              <div className='card mt-4 flex cursor-pointer items-center border-0 bg-[#F9F9F9] p-4'>
                <CalendarDaysIcon size={24} color='#13C2C2' className='mr-2' />
                <span className='mr-auto text-[12px] font-bold'>
                  See Availability
                </span>
                <ArrowRightIcon color='#13C2C2' />
              </div>
            </PractitionerAvailability>

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
          </>
        )}
      </div>

      <Drawer open={isOpen} onOpenChange={() => setIsOpen(false)}>
        <DrawerContent className='mx-auto max-w-screen-sm p-4'>
          {renderDrawerContent}
        </DrawerContent>
      </Drawer>
    </>
  );
}