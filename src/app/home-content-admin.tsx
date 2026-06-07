'use client';

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
import Link from 'next/link';

function ActionCard({
  icon,
  title,
  description,
  href
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className='card flex w-full items-center gap-3 p-4'>
      <div className='flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[#F8F8F8]'>
        {icon}
      </div>
      <div className='flex flex-col'>
        <span className='text-primary text-[12px] font-bold'>{title}</span>
        <span className='text-primary text-[10px]'>{description}</span>
      </div>
    </Link>
  );
}

function StatCard({
  icon,
  value,
  label,
  bgColor,
  iconColor
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  bgColor: string;
  iconColor: string;
}) {
  return (
    <div className='card flex items-center gap-4 p-4'>
      <div
        className={`flex h-[48px] w-[48px] items-center justify-center rounded-full ${bgColor}`}
      >
        <div className={iconColor}>{icon}</div>
      </div>
      <div>
        <div className='text-[24px] font-bold'>{value}</div>
        <div className='text-[12px] text-gray-500'>{label}</div>
      </div>
    </div>
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
      <section className='p-4'>
        <h2 className='mb-2 text-[14px] font-bold text-[#2C2F3599]'>
          Clinic Overview
        </h2>
        <div className='flex flex-col gap-4'>
          <StatCard
            icon={<Users />}
            value={isCountError ? '-' : practitionerCount}
            label='Active Practitioners'
            bgColor='bg-[#E6F7F7]'
            iconColor='text-[#13C2C2]'
          />
          <StatCard
            icon={<Clock />}
            value='-'
            label='Pending Approvals'
            bgColor='bg-[#FFF7E6]'
            iconColor='text-[#FAAD14]'
          />
        </div>
      </section>

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
            onClick={() => refetchCount()}
            className='text-secondary w-full rounded-lg border border-gray-200 py-2 text-[12px]'
          >
            Failed to load practitioner data. Tap to retry.
          </button>
        </div>
      )}
    </>
  );
}
