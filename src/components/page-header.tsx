/* eslint-disable complexity */
'use client';

import Avatar from '@/components/general/avatar';
import RoleAvatarPopup from '@/components/role-avatar-popup';
import UpcomingSession from '@/components/schedule/upcoming-session';
import { getNow } from '@/constants/date';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useUpcomingEvents } from '@/hooks/useUpcomingEvents';
import { STORES, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import {
  generateAvatarPlaceholder,
  parseMergedAppointments,
  parseMergedSessions
} from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import { isAfter, parseISO } from 'date-fns';
import { Calendar, ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface PageHeaderProps {
  pageIndicator?: string;
  backRoute?: string;
  hideUpcomingSession?: boolean;
}

const FIRST_LEVEL_ROUTES = new Set([
  '/clinic',
  '/assessments',
  '/profile',
  '/recommendation',
  '/schedule',
  '/exercise'
]);

/** Returns the page title based on current route. */
function getPageIndicator(
  pathname: string,
  searchParams: URLSearchParams
): string | null {
  switch (pathname) {
    case '/': {
      return 'Welcome to Your Dashboard';
    }
    case '/clinic': {
      if (searchParams.has('clinicId')) return null;
      return 'Book a Session';
    }
    case '/assessments': {
      return 'Assessment Center';
    }
    case '/profile': {
      return 'User Profile';
    }
    case '/recommendation': {
      return 'Recommended for You';
    }
    default: {
      return '';
    }
  }
}

/** Determines the default back navigation route. */
function getDefaultBackRoute(
  pathname: string,
  searchParams: URLSearchParams
): string | undefined {
  if (pathname === '/') return undefined;
  if (pathname === '/clinic' && searchParams.has('clinicId')) return '/clinic';
  if (FIRST_LEVEL_ROUTES.has(pathname)) return '/';
  return undefined;
}

/**
 *
 */
export default function PageHeader({
  pageIndicator: overrideIndicator,
  backRoute: overrideBackRoute,
  hideUpcomingSession
}: Readonly<PageHeaderProps>) {
  const rawPathname = usePathname();
  const pathname =
    rawPathname.length > 1 && rawPathname.endsWith('/')
      ? rawPathname.slice(0, -1)
      : rawPathname;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state: authState, isLoading: isLoadingAuth } = useAuth();
  const { appointmentData, sessionData } = useUpcomingEvents();

  const indicator =
    overrideIndicator ?? getPageIndicator(pathname, searchParams) ?? '';

  const role = authState?.userInfo?.role_name;
  const isPatient = role === Roles.Patient;
  const isAdmin = role === Roles.ClinicAdmin;

  const displayName =
    !authState?.userInfo?.fullname ||
    authState.userInfo?.fullname.trim() === '-'
      ? authState?.userInfo?.email
      : authState?.userInfo?.fullname;

  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    dbGet<{ value: string }>(STORES.uiPreferences, ['', 'clinic_organization'])
      .then(saved => {
        if (saved?.value) setSelectedClinicId(saved.value);
        return null;
      })
      .catch(() => {
        /* IndexedDB unavailable */
      });
  }, [isAdmin]);

  const { data: clinicName, isLoading: isClinicNameLoading } = useQuery({
    queryKey: ['clinic-name', selectedClinicId],
    queryFn: async () => {
      const API = await getAPI();
      const orgResp = await API.get(
        `/fhir/Organization/${selectedClinicId}?_elements=name`
      );
      return (orgResp.data as { name?: string } | undefined)?.name ?? '-';
    },
    enabled: Boolean(isAdmin && selectedClinicId)
  });

  const guestAvatar = useMemo(() => {
    const seed = crypto.randomUUID();
    const placeholder = generateAvatarPlaceholder({ id: seed, name: 'Guest' });
    return {
      ...placeholder,
      initials: placeholder.initials ?? '',
      backgroundColor: placeholder.backgroundColor ?? ''
    };
  }, []);

  const parsedAppointmentsData = useMemo(() => {
    if (
      !appointmentData ||
      appointmentData?.total === 0 ||
      !authState.isAuthenticated
    )
      return null;

    const parsed = parseMergedAppointments(appointmentData);
    const filtered = parsed.filter(session => {
      const slotStart = parseISO(session.slotStart ?? '');
      return isAfter(slotStart, getNow());
    });

    return filtered;
  }, [appointmentData, authState]);

  const parsedSessionsData = useMemo(() => {
    if (!sessionData || sessionData?.total === 0 || !authState.isAuthenticated)
      return null;

    const parsed = parseMergedSessions(sessionData);
    const filtered = parsed.filter(session => {
      const slotStart = parseISO(session.slotStart ?? '');
      return isAfter(slotStart, getNow());
    });

    return filtered;
  }, [sessionData, authState]);

  const allData = isPatient ? parsedAppointmentsData : parsedSessionsData;
  const upcomingData = allData?.slice(0, 1) ?? null;
  const hasUpcomingSession =
    upcomingData && upcomingData.length > 0 && !isAdmin && !hideUpcomingSession;

  const showBack = pathname !== '/';
  const backAction =
    overrideBackRoute ?? getDefaultBackRoute(pathname, searchParams);

  /** Navigates back using the backAction or browser history. */
  const handleBack = () => {
    if (backAction) {
      const url = backAction === '/' ? backAction : backAction + '/';
      router.push(url);
    } else {
      router.back();
    }
  };

  return (
    <div className='bg-[#efefef] px-4 pt-4 pb-8'>
      <div className='relative flex items-center justify-end'>
        {showBack && (
          <ChevronLeftIcon
            size={24}
            color='#2c2f35'
            className='absolute left-0 cursor-pointer'
            onClick={handleBack}
          />
        )}

        {!isLoadingAuth && authState.isAuthenticated ? (
          <RoleAvatarPopup indicator={indicator} displayName={displayName} />
        ) : (
          <Link href='/auth' className='flex items-center gap-2'>
            <div className='flex flex-col text-right'>
              {indicator && (
                <div className='text-xs font-normal text-[#2c2f35]'>
                  {indicator}
                </div>
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
        )}
      </div>

      {hasUpcomingSession && (
        <>
          <UpcomingSession data={upcomingData} role={role ?? ''} />
          <div className='mt-1 flex justify-end'>
            <Link href='/schedule' className='text-[10px] text-[#2c2f35]'>
              See All
            </Link>
          </div>
        </>
      )}

      {isAdmin && (
        <>
          {isClinicNameLoading && (
            <div className='card mt-4 flex items-center border-0 bg-[#F9F9F9] p-4'>
              <div className='mr-[10pxpx] h-5 w-5 animate-pulse rounded bg-gray-200' />
              <div className='mr-auto flex flex-col gap-1'>
                <div className='h-3 w-20 animate-pulse rounded bg-gray-200' />
                <div className='h-4 w-40 animate-pulse rounded bg-gray-200' />
              </div>
            </div>
          )}
          {!isClinicNameLoading && clinicName && clinicName !== '-' && (
            <Link
              href='/clinic'
              className='card mt-4 flex items-center border-0 bg-[#F9F9F9]'
            >
              <Calendar className='mr-[10px] h-5 w-5 shrink-0 text-black' />
              <div className='mr-auto flex flex-col'>
                <span className='text-muted text-[12px]'>
                  Currently Managing
                </span>
                <span className='text-secondary text-left text-[14px] font-bold'>
                  {clinicName}
                </span>
              </div>
            </Link>
          )}
        </>
      )}
    </div>
  );
}
