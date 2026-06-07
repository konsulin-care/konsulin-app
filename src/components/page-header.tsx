'use client';

import RoleAvatarPopup from '@/components/role-avatar-popup';
import UpcomingSession from '@/components/schedule/upcoming-session';
import { getNow } from '@/constants/date';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useUpcomingEvents } from '@/hooks/useUpcomingEvents';
import { parseMergedAppointments, parseMergedSessions } from '@/utils/helper';
import { isAfter, parseISO } from 'date-fns';
import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

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

function getPageIndicator(
  pathname: string,
  searchParams: URLSearchParams
): string | null {
  switch (pathname) {
    case '/':
      return 'Welcome to Your Dashboard';
    case '/clinic':
      if (searchParams.has('clinicId')) return null;
      return 'Book a Session';
    case '/assessments':
      return 'Assessment Center';
    case '/profile':
      return 'User Profile';
    case '/recommendation':
      return 'Recommended for You';
    default:
      return '';
  }
}

function getDefaultBackRoute(
  pathname: string,
  searchParams: URLSearchParams
): string | undefined {
  if (pathname === '/') return undefined;
  if (pathname === '/clinic' && searchParams.has('clinicId')) return '/clinic';
  if (FIRST_LEVEL_ROUTES.has(pathname)) return '/';
  return undefined;
}

export default function PageHeader({
  pageIndicator: overrideIndicator,
  backRoute: overrideBackRoute,
  hideUpcomingSession
}: Readonly<PageHeaderProps>) {
  const pathname = usePathname();
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

  const parsedAppointmentsData = useMemo(() => {
    if (
      !appointmentData ||
      appointmentData?.total === 0 ||
      !authState.isAuthenticated
    )
      return null;

    const parsed = parseMergedAppointments(appointmentData);
    const filtered = parsed.filter(session => {
      const slotStart = parseISO(session.slotStart);
      return isAfter(slotStart, getNow());
    });

    return filtered;
  }, [appointmentData, authState]);

  const parsedSessionsData = useMemo(() => {
    if (!sessionData || sessionData?.total === 0 || !authState.isAuthenticated)
      return null;

    const parsed = parseMergedSessions(sessionData);
    const filtered = parsed.filter(session => {
      const slotStart = parseISO(session.slotStart);
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

  const handleBack = () => {
    if (backAction) {
      router.push(backAction);
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
          <div className='flex h-[32px] items-center text-sm font-bold text-[#2c2f35]'>
            Konsulin
          </div>
        )}
      </div>

      {hasUpcomingSession && (
        <>
          <UpcomingSession data={upcomingData} role={role} />
          <div className='mt-1 flex justify-end'>
            <Link href='/schedule' className='text-[10px] text-[#2c2f35]'>
              See All
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
