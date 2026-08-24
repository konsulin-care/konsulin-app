'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

import ActionCard from '@/components/general/action-card';
import CardLoader from '@/components/general/card-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { STORES, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock, Cog, FileText, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

/** Stat card showing the active practitioner count. */
function PractitionerCountCard({
  count,
  isError
}: Readonly<{ count: number; isError: boolean }>) {
  return (
    <Link href='/practitioner' className='block'>
      <div className='card flex items-center gap-4 p-4'>
        <div className='flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#E6F7F7]'>
          <Users className='text-[#13C2C2]' />
        </div>
        <div>
          <div className='text-[24px] font-bold'>{isError ? '-' : count}</div>
          <div className='text-[12px] text-gray-500'>Active Practitioners</div>
        </div>
      </div>
    </Link>
  );
}

/** Stat card showing booked appointments today (placeholder until Location connector is built). */
function BookedAppointmentsTodayCard() {
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  useEffect(() => {
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'clinic_organization'])
      .then(saved => {
        if (saved?.value) setSelectedClinicId(saved.value);
        return null;
      })
      .catch(() => {
        /* IndexedDB unavailable — remain null */
      });
  }, []);

  // Disabled query — when Location infrastructure is ready, replace with:
  // GET /fhir/Appointment?location=Location/<loc-id>&date=today&status=booked&_summary=count
  useQuery({
    queryKey: ['booked-today', selectedClinicId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/Appointment?location=Location/&date=today&status=booked&_summary=count`
      );
      return response.data?.total ?? 0;
    },
    enabled: false // Location ID not available yet
  });

  return (
    <div className='card flex items-center gap-4 p-4'>
      <div className='flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#F0F5FF]'>
        <CalendarDays className='text-[#2F54EB]' />
      </div>
      <div>
        <div className='text-[24px] font-bold'>-</div>
        <div className='text-[12px] text-gray-500'>
          Booked Appointments Today
        </div>
      </div>
    </div>
  );
}

/** Stat card showing pending approvals placeholder. */
function PendingApprovalsCard() {
  return (
    <div className='card flex items-center gap-4 p-4'>
      <div className='flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#FFF7E6]'>
        <Clock className='text-[#FAAD14]' />
      </div>
      <div>
        <div className='text-[24px] font-bold'>-</div>
        <div className='text-[12px] text-gray-500'>Pending Approvals</div>
      </div>
    </div>
  );
}

/** Admin home page with stats and service management. */
export default function HomeContentAdmin() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  useEffect(() => {
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'clinic_organization'])
      .then(saved => {
        if (saved?.value) setSelectedClinicId(saved.value);
        return null;
      })
      .catch(() => {
        /* IndexedDB unavailable */
      });
  }, []);

  const {
    data: practitionerCount,
    isFetching: isCountFetching,
    isError: isCountError,
    refetch: refetchCount
  } = useQuery({
    queryKey: ['practitioner-count', selectedClinicId],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get(
        `/fhir/Practitioner?_has:PractitionerRole:practitioner:organization=Organization/${selectedClinicId}&_has:PractitionerRole:practitioner:active=true&_summary=count`
      );
      return response.data?.total ?? 0;
    },
    enabled: Boolean(authState?.userInfo?.fhirId) && Boolean(selectedClinicId)
  });

  /** Retry loading practitioner count on error. */
  const handleRetryCount = useCallback(() => {
    refetchCount().catch(() => {
      /* error already handled by isError state */
    });
  }, [refetchCount]);

  const isLoading = isAuthLoading || isCountFetching;

  if (isLoading) {
    return (
      <div className='p-4'>
        <Skeleton className='mb-4 h-[100px] w-full bg-[hsl(210,40%,96.1%)]' />
        <CardLoader item={3} height='h-[60px]' />
      </div>
    );
  }

  return (
    <>
      {/* Stat cards — no section title */}
      <div className='flex flex-col gap-4 p-4'>
        <PractitionerCountCard
          count={practitionerCount}
          isError={isCountError}
        />
        <BookedAppointmentsTodayCard />
        <PendingApprovalsCard />
      </div>

      <section className='p-4'>
        <h2 className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
          Service Management
        </h2>
        <div className='flex flex-col gap-4'>
          <ActionCard
            icon={<Cog />}
            title='Clinic Details'
            description='Configure clinic information and services'
            href='/clinic'
          />
          <ActionCard
            icon={<FileText />}
            title='Reports'
            description='Generate operational and clinical reports'
            href='/record'
          />
        </div>
      </section>

      {isCountError && (
        <div className='px-4 pb-4'>
          <button
            type='button'
            onClick={handleRetryCount}
            className='text-secondary w-full rounded-lg border border-gray-200 py-2 text-[12px]'
          >
            Failed to load practitioner data. Tap to retry.
          </button>
        </div>
      )}
    </>
  );
}
