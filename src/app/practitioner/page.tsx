'use client';

/* eslint-disable max-lines -- component file exceeds 300-line limit */

import Avatar from '@/components/general/avatar';
import EmptyState from '@/components/general/empty-state';
import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { PractitionerCard } from '@/components/practitioner/practitioner-card';
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
import { STORES, dbGet } from '@/lib/indexeddb';
import {
  useDetailPractitioner,
  usePractitionerListing
} from '@/services/clinic';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import PractitionerAvailability from './practitioner-availability';

type IPractitionerLocalStorage = {
  roleId: string;
  name: HumanName[];
  photo: Attachment[];
  qualification: PractitionerQualification[];
  email: string;
};

/** Full-screen loading spinner. */
function LoadingState() {
  return (
    <div className='flex min-h-screen min-w-full items-center justify-center'>
      <LoadingSpinnerIcon
        width={56}
        height={56}
        className='w-full animate-spin'
      />
    </div>
  );
}

/** Empty state shown when no practitioner is found or data is missing. */
function EmptyPractitionerState() {
  return (
    <EmptyState
      className='py-16'
      title='Practitioner Not Found'
      subtitle='Please return to the clinic page and select a practitioner.'
    />
  );
}

/** Practitioner header with avatar, organization badge, and display name. */
function PractitionerHeader({
  seed,
  placeholderInitials,
  placeholderBg,
  photoUrl,
  orgName,
  displayName
}: Readonly<{
  seed: string;
  placeholderInitials: string;
  placeholderBg: string;
  photoUrl?: string;
  orgName: string;
  displayName: string;
}>) {
  return (
    <div className='flex flex-col items-center'>
      <div className='flex flex-col items-center'>
        <Avatar
          seed={seed}
          initials={placeholderInitials}
          backgroundColor={placeholderBg}
          photoUrl={photoUrl}
          className='text-2xl'
        />

        <Badge className='mt-[-15px] flex min-h-[24px] min-w-[100px] justify-center gap-1 bg-[#08979C] font-normal text-white'>
          <HeartPulse size={16} color='#08979C' fill='white' />
          <span className='whitespace-nowrap'>{orgName}</span>
        </Badge>
      </div>
      <h3 className='mt-2 text-center text-[20px] font-bold'>{displayName}</h3>
    </div>
  );
}

/** Trigger card shown inside PractitionerAvailability to reveal the calendar. */
function AvailabilityTrigger() {
  return (
    <div className='card mt-4 flex cursor-pointer items-center border-0 bg-[#F9F9F9] p-4'>
      <CalendarDaysIcon size={24} color='#13C2C2' className='mr-2' />
      <span className='mr-auto text-[12px] font-bold'>See Availability</span>
      <ArrowRightIcon color='#13C2C2' />
    </div>
  );
}

/** Practitioner booking page with avatar, availability calendar, and payment flow. */
export default function Practitioner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const practitionerRoleId = searchParams.get('practitionerRoleId') ?? '';
  const { state: bookingState, dispatch } = useBooking();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<
    string | undefined
  >();
  const [practitionerData, setPractitionerData] =
    useState<IPractitionerLocalStorage>();
  const [practitionerDataLoading, setPractitionerDataLoading] = useState(true);

  useEffect(() => {
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'selected_clinic'])
      .then(saved => {
        if (saved?.value) {
          setSelectedClinicId(saved.value);
        }
        return null;
      })
      .catch((err: unknown) => console.warn('[IndexedDB]', err));
  }, []);

  useEffect(() => {
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'selected_location'])
      .then(saved => {
        if (saved?.value) setSelectedLocationId(saved.value);
        return null;
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  useEffect(() => {
    if (!practitionerRoleId) return;

    dbGet<{ value: IPractitionerLocalStorage }>(STORES.uiPreferences, [
      '',
      'selected_practitioner'
    ])
      .then(saved => {
        if (saved?.value?.roleId === practitionerRoleId) {
          setPractitionerData(saved.value);
        } else {
          setPractitionerData(undefined);
        }
        setPractitionerDataLoading(false);
        return saved;
      })
      .catch((err: unknown) => {
        console.warn('[IndexedDB]', err);
        setPractitionerDataLoading(false);
      });
  }, [practitionerRoleId]);

  useEffect(() => {
    if (bookingState.isBookingSubmitted) {
      setIsOpen(true);
      dispatch({ type: 'RESET_BOOKING_INFO' });
    }
  }, [bookingState.isBookingSubmitted, dispatch]);

  const {
    newData: detailPractitioner,
    isLoading,
    isError,
    isFetching
  } = useDetailPractitioner(practitionerData?.roleId ?? '');

  const { practitioners, isLoading: isListingLoading } = usePractitionerListing(
    selectedClinicId,
    selectedLocationId
  );

  /** Navigate back to home after booking submission. */
  const handleClose = () => {
    startTransition(() => {
      router.push('/');
    });
  };

  const displayName = useMemo(() => {
    const name = mergeNames(
      practitionerData?.name ?? [],
      practitionerData?.qualification
    );

    return name;
  }, [practitionerData]);

  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id: practitionerRoleId,
    name: displayName,
    email: practitionerData?.email
  });
  const placeholderInitials = initials ?? '';
  const placeholderBg = backgroundColor ?? '';

  const photoUrl = practitionerData?.photo?.[0]?.url;

  /**
   * Format fee display string. Safe to call only after detailPractitioner is
   * verified truthy by the parent guard in renderMainContent.
   */
  const renderFeeText = () => {
    const inv = detailPractitioner?.invoice;
    if (!inv?.totalNet) return '-';
    const { value, currency } = inv.totalNet;
    return `${new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(value)} / Session`;
  };

  /**
   * Render specialty badges. Safe to call only after detailPractitioner is
   * verified truthy by the parent guard in renderMainContent.
   */
  const renderSpecialtyBadges = () => {
    const specialties = detailPractitioner?.resource?.specialty;
    if (!specialties?.length) return null;
    return specialties.map((s: CodeableConcept) => (
      <Badge key={s.text} className='bg-[#E1E1E1] px-2 py-[2px] font-normal'>
        {s.text}
      </Badge>
    ));
  };

  const drawerFooter = (
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
  );

  const renderDrawerContent = (
    <>
      <DrawerHeader className='mx-auto flex flex-col items-center gap-4 pb-0 text-[20px]'>
        {}
        <Image
          className='rounded-[8px] object-cover p-6'
          src={'/images/booking-success.png'}
          height={0}
          width={200}
          style={{ width: 'auto', height: 'auto' }}
          alt='success'
        />
        {}
        <DrawerTitle className='mb-2 text-center text-2xl font-bold'>
          Selamat! Anda Telah Berhasil Memesan Sesi Konsultasi
        </DrawerTitle>
      </DrawerHeader>

      <DrawerDescription className='px-4 text-center text-sm opacity-50'>
        Pemesanan Anda telah berhasil, and kami telah mencatat detail sesi
        konsultasi Anda
      </DrawerDescription>

      {drawerFooter}
    </>
  );

  /** Renders listing of practitioner cards (admin view). */
  const renderListingContent = () => {
    if (isListingLoading) return <LoadingState />;

    if (practitioners.length === 0) {
      return (
        <EmptyState
          className='py-16'
          title='No Practitioners Found'
          subtitle='Try another clinic.'
        />
      );
    }

    return (
      <div className='flex flex-col gap-4'>
        {practitioners.map(p => (
          <PractitionerCard key={p.id} {...p} />
        ))}
      </div>
    );
  };

  /** Renders main practitioner content, loading, or empty states. */
  const renderMainContent = () => {
    // Listing mode (admin view)
    if (!practitionerRoleId) return renderListingContent();

    // Detail mode (existing behavior)
    if (practitionerDataLoading) return <LoadingState />;
    if (!practitionerData) return <EmptyPractitionerState />;
    if (isLoading || isFetching) return <LoadingState />;
    if (!detailPractitioner || isError) return <EmptyPractitionerState />;

    const { organization, resource, invoice, schedule } = detailPractitioner;
    const orgName = organization?.name ?? '';
    const scheduleId = schedule?.id ?? '';

    return (
      <>
        <PractitionerHeader
          seed={seed}
          placeholderInitials={placeholderInitials}
          placeholderBg={placeholderBg}
          photoUrl={photoUrl}
          orgName={orgName}
          displayName={displayName}
        />

        <PractitionerAvailability
          practitionerRole={resource}
          scheduleId={scheduleId}
          invoice={invoice}
          practitionerName={displayName}
          practitionerOrganizationName={orgName}
          practitionerAvatar={{
            photoUrl,
            initials: placeholderInitials,
            backgroundColor: placeholderBg
          }}
        >
          <AvailabilityTrigger />
        </PractitionerAvailability>

        <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9] p-4'>
          <div className='flex items-center'>
            <HospitalIcon size={24} color='#13C2C2' className='mr-2' />
            <span className='text-[12px] font-bold'>Practice Information</span>
          </div>
          <div className='mt-4 flex flex-col space-y-2'>
            <div className='flex justify-between text-[12px]'>
              <span className='mr-2'>Affiliation</span>
              <span className='font-bold'>{orgName}</span>
            </div>
            <div className='flex justify-between text-[12px]'>
              <span className='mr-2'>Fee</span>
              <span className='font-bold'>{renderFeeText()}</span>
            </div>
          </div>
        </div>

        {resource?.specialty && (
          <div className='card mt-4 flex flex-col border-0 bg-[#F9F9F9]'>
            <div className='flex items-center'>
              <HospitalIcon size={32} color='#13C2C2' className='mr-2' />
              <span className='text-[12px] font-bold'>Specialty</span>
            </div>

            <div className='mt-4 flex flex-wrap gap-2'>
              {renderSpecialtyBadges()}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <PageHeader
        pageIndicator={
          practitionerRoleId ? `View ${displayName}` : 'Manage Practitioners'
        }
        backRoute={
          practitionerRoleId ? `/clinic?clinicId=${selectedClinicId}` : '/'
        }
      />

      <div className='mt-[-24px] flex grow flex-col rounded-[16px] bg-white p-4'>
        {renderMainContent()}
      </div>

      {practitionerRoleId && (
        <Drawer open={isOpen} onOpenChange={() => setIsOpen(false)}>
          <DrawerContent className='mx-auto max-w-screen-sm p-4'>
            {renderDrawerContent}
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
