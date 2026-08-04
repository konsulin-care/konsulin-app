'use client';

import Avatar from '@/components/general/avatar';
import ResearchHeaderWidget from '@/components/research/research-header-widget';
import RoleAvatarPopup from '@/components/role-avatar-popup';
import UpcomingSession from '@/components/schedule/upcoming-session';
import { getNow } from '@/constants/date';
import type { MergedAppointment, MergedSession } from '@/types/appointment';
import { parseMergedAppointments, parseMergedSessions } from '@/utils/helper';
import { isAfter, parseISO } from 'date-fns';
import type { Bundle } from 'fhir/r4';
import { Calendar } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

/** Avatar seed fields consumed by the guest link in AuthArea. */
export interface GuestAvatar {
  seed: string;
  initials: string;
  backgroundColor: string;
}

/** Returns true when the session slot start is still in the future. */
function isFutureSession(slotStart: string | null | undefined): boolean {
  return isAfter(parseISO(slotStart ?? ''), getNow());
}

/**
 * Computes the single nearest upcoming session for the current role,
 * or null when there is none.
 */
export function useUpcomingSession(
  appointmentData: Bundle | undefined,
  sessionData: Bundle | undefined,
  isPatient: boolean,
  isAuthenticated: boolean
): MergedAppointment[] | MergedSession[] | null {
  const parsedAppointments = useMemo(() => {
    if (!appointmentData || appointmentData.total === 0 || !isAuthenticated) {
      return null;
    }
    return parseMergedAppointments(appointmentData).filter(session =>
      isFutureSession(session.slotStart)
    );
  }, [appointmentData, isAuthenticated]);

  const parsedSessions = useMemo(() => {
    if (!sessionData || sessionData.total === 0 || !isAuthenticated) {
      return null;
    }
    return parseMergedSessions(sessionData).filter(session =>
      isFutureSession(session.slotStart)
    );
  }, [sessionData, isAuthenticated]);

  const allData = isPatient ? parsedAppointments : parsedSessions;
  return allData?.slice(0, 1) ?? null;
}

/** Renders the authenticated avatar or the guest login link. */
export function AuthArea({
  isLoading,
  isAuthenticated,
  indicator,
  displayName,
  guestAvatar
}: Readonly<{
  isLoading: boolean;
  isAuthenticated: boolean;
  indicator: string;
  displayName: string | undefined;
  guestAvatar: GuestAvatar;
}>) {
  if (!isLoading && isAuthenticated) {
    return <RoleAvatarPopup indicator={indicator} displayName={displayName} />;
  }
  return (
    <Link href='/auth' className='flex items-center gap-2'>
      <div className='flex flex-col text-right'>
        {indicator && (
          <div className='text-xs font-normal text-[#2c2f35]'>{indicator}</div>
        )}
        <div className='text-sm font-bold text-[#2c2f35]'>Guest</div>
      </div>
      <Avatar
        seed={guestAvatar.seed}
        initials={guestAvatar.initials}
        backgroundColor={guestAvatar.backgroundColor}
        height={32}
        width={32}
        className='text-xs'
        imageClassName='self-center'
      />
    </Link>
  );
}

/** Renders the upcoming session card with its See All link. */
export function UpcomingSessionBlock({
  data,
  role,
  isAdmin,
  hideUpcomingSession
}: Readonly<{
  data: MergedAppointment[] | MergedSession[] | null;
  role: string | undefined;
  isAdmin: boolean;
  hideUpcomingSession?: boolean;
}>) {
  if (!data || data.length === 0 || isAdmin || hideUpcomingSession) {
    return null;
  }
  return (
    <>
      <UpcomingSession data={data} role={role ?? ''} />
      <div className='mt-1 flex justify-end'>
        <Link href='/schedule' className='text-[10px] text-[#2c2f35]'>
          See All
        </Link>
      </div>
    </>
  );
}

/** Renders the research progress widget subject to role and route gating. */
export function ResearchHeaderWidgetSection({
  isLoadingAuth,
  isAdmin,
  pathname,
  isPatient,
  isAuthenticated
}: Readonly<{
  isLoadingAuth: boolean;
  isAdmin: boolean;
  pathname: string;
  isPatient: boolean;
  isAuthenticated: boolean;
}>) {
  if (
    isLoadingAuth ||
    isAdmin ||
    pathname === '/research' ||
    (!isPatient && isAuthenticated)
  ) {
    return null;
  }
  return <ResearchHeaderWidget />;
}

/** Renders the clinic-name loading skeleton or the managing link. */
export function AdminClinicCard({
  isLoading,
  clinicName
}: Readonly<{
  isLoading: boolean;
  clinicName: string | undefined;
}>) {
  if (isLoading) {
    return (
      <div className='card mt-4 flex items-center border-0 bg-[#F9F9F9] p-4'>
        <div className='mr-[10pxpx] h-5 w-5 animate-pulse rounded bg-gray-200' />
        <div className='mr-auto flex flex-col gap-1'>
          <div className='h-3 w-20 animate-pulse rounded bg-gray-200' />
          <div className='h-4 w-40 animate-pulse rounded bg-gray-200' />
        </div>
      </div>
    );
  }
  if (clinicName && clinicName !== '-') {
    return (
      <Link
        href='/clinic'
        className='card mt-4 flex items-center border-0 bg-[#F9F9F9]'
      >
        <Calendar className='mr-[10px] h-5 w-5 shrink-0 text-black' />
        <div className='mr-auto flex flex-col'>
          <span className='text-muted text-[12px]'>Currently Managing</span>
          <span className='text-secondary text-left text-[14px] font-bold'>
            {clinicName}
          </span>
        </div>
      </Link>
    );
  }
  return null;
}
