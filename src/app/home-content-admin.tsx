'use client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

import ActionCard from '@/components/general/action-card';
import CardLoader from '@/components/general/card-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth/authContext';
import { getAPI } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CalendarRange,
  Clock,
  Cog,
  FileText,
  Users
} from 'lucide-react';
import { useCallback } from 'react';

/** Stat card showing the active practitioner count. */
function PractitionerCountCard({
  count,
  isError
}: Readonly<{ count: number; isError: boolean }>) {
  return (
    <div className='card flex items-center gap-4 p-4'>
      <div className='flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#E6F7F7]'>
        <Users className='text-[#13C2C2]' />
      </div>
      <div>
        <div className='text-[24px] font-bold'>{isError ? '-' : count}</div>
        <div className='text-[12px] text-gray-500'>Active Practitioners</div>
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

/** Clinic overview section showing practitioner count and pending approvals. */
function ClinicOverviewSection({
  practitionerCount,
  isCountError
}: Readonly<{ practitionerCount: number; isCountError: boolean }>) {
  return (
    <section className='p-4'>
      <h2 className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
        Clinic Overview
      </h2>
      <div className='flex flex-col gap-4'>
        <PractitionerCountCard
          count={practitionerCount}
          isError={isCountError}
        />
        <PendingApprovalsCard />
      </div>
    </section>
  );
}

/** Clinic context card showing the active clinic (coming soon). */
function ClinicContextSection() {
  return (
    <section className='p-4'>
      <h2 className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
        Clinic Context
      </h2>
      <div className='card flex items-center gap-4 p-4 opacity-60'>
        <div className='flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#F8F8F8]'>
          <Building2 className='h-5 w-5 text-gray-400' />
        </div>
        <div className='flex flex-col'>
          <span className='text-[12px] font-bold'>Active Clinic</span>
          <span className='text-[10px] text-gray-500'>
            Clinic switcher coming soon
          </span>
        </div>
      </div>
    </section>
  );
}

/** Admin home page with clinic overview, context, and service management. */
export default function HomeContentAdmin() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const {
    data: practitionerCount,
    isLoading: isCountLoading,
    isError: isCountError,
    refetch: refetchCount
  } = useQuery({
    queryKey: ['practitioner-count'],
    queryFn: async () => {
      const API = await getAPI();
      const response = await API.get('/fhir/Practitioner?_summary=count');
      return response.data?.total ?? 0;
    },
    enabled: Boolean(authState?.userInfo?.fhirId)
  });

  /** Retry loading practitioner count on error. */
  const handleRetryCount = useCallback(() => {
    refetchCount().catch(() => {
      /* error already handled by isError state */
    });
  }, [refetchCount]);

  const isLoading = isAuthLoading || isCountLoading;

  if (isLoading) {
    return (
      <div className='p-4'>
        <Skeleton className='mb-4 h-[100px] w-full bg-[hsl(210,40%,96.1%)]' />
        <CardLoader item={4} height='h-[60px]' />
      </div>
    );
  }

  return (
    <>
      <ClinicOverviewSection
        practitionerCount={practitionerCount}
        isCountError={isCountError}
      />

      <ClinicContextSection />

      <section className='p-4'>
        <h2 className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
          Service Management
        </h2>
        <div className='flex flex-col gap-4'>
          <ActionCard
            icon={<Cog />}
            title='Manage Practitioners'
            description='View and manage practitioner profiles'
            href='/practitioner'
          />
          <ActionCard
            icon={<Building2 />}
            title='Clinic Settings'
            description='Configure clinic information and services'
            href='/clinic'
          />
          <ActionCard
            icon={<CalendarRange />}
            title='View Schedule'
            description='Review clinic-wide appointment schedule'
            href='/schedule'
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
