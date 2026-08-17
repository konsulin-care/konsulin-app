'use client';

import HeaderReminder from '@/components/header-reminder';
import {
  AdminClinicCard,
  AuthArea,
  GuestAvatar,
  ResearchHeaderWidgetSection,
  UpcomingSessionBlock,
  canShowResearchHeader,
  isSessionCardAvailable,
  isSessionWithinWindow,
  shouldShowSeeAll,
  useUpcomingSession
} from '@/components/page-header-sections';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useUpcomingEvents } from '@/hooks/useUpcomingEvents';
import { STORES, dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { generateGuestSeed } from '@/utils/guest-seed';
import { generateAvatarPlaceholder } from '@/utils/helper';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface PageHeaderProps {
  pageIndicator?: string;
  backRoute?: string;
  hideUpcomingSession?: boolean;
}

const MAIN_ROUTES = new Set([
  '/clinic',
  '/record',
  '/assessments',
  '/profile',
  '/recommendation',
  '/schedule',
  '/research'
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
      if (searchParams.has('id')) return null;
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
    case '/research': {
      return 'Research';
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
  if (MAIN_ROUTES.has(pathname)) {
    if (searchParams.toString()) return pathname;
    return '/';
  }
  return undefined;
}

/** Resolves the display name, falling back to email for placeholder values. */
function getDisplayName(
  userInfo: { fullname?: string; email?: string } | undefined
): string | undefined {
  if (!userInfo?.fullname || userInfo.fullname.trim() === '-') {
    return userInfo?.email;
  }
  return userInfo?.fullname;
}

/**
 * Page header with back navigation, auth area, upcoming session,
 * research widget, and the admin clinic switcher.
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

  const role = authState.userInfo.role_name;
  const isPatient = role === Roles.Patient;
  const isAdmin = role === Roles.ClinicAdmin;

  const displayName = getDisplayName(authState.userInfo);

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
      const data: unknown = orgResp.data;
      const name =
        data && typeof data === 'object' && 'name' in data
          ? (data as Record<string, unknown>).name
          : undefined;
      return typeof name === 'string' && name ? name : '-';
    },
    enabled: Boolean(isAdmin && selectedClinicId)
  });

  const guestAvatar: GuestAvatar = useMemo(() => {
    const seed = generateGuestSeed();
    const placeholder = generateAvatarPlaceholder({ id: seed, name: 'Guest' });
    return {
      ...placeholder,
      initials: placeholder.initials ?? '',
      backgroundColor: placeholder.backgroundColor ?? ''
    };
  }, []);

  const upcomingData = useUpcomingSession(
    appointmentData,
    sessionData,
    isPatient,
    authState.isAuthenticated
  );

  /** /research renders no header reminder cards, mirroring canShowResearchHeader. */
  const hideSessionCard = hideUpcomingSession || pathname === '/research';

  const hasSessionCard = isSessionCardAvailable(
    upcomingData,
    isAdmin,
    hideSessionCard
  );

  const isSessionUrgent = hasSessionCard && isSessionWithinWindow(upcomingData);

  const researchEligible = canShowResearchHeader({
    isLoadingAuth,
    isAdmin,
    pathname,
    isPatient,
    isAuthenticated: authState.isAuthenticated
  });

  const sessionCard = hasSessionCard ? (
    <UpcomingSessionBlock
      data={upcomingData}
      role={role}
      isAdmin={isAdmin}
      hideUpcomingSession={hideSessionCard}
    />
  ) : undefined;

  const researchCard = researchEligible ? (
    <ResearchHeaderWidgetSection
      isLoadingAuth={isLoadingAuth}
      isAdmin={isAdmin}
      pathname={pathname}
      isPatient={isPatient}
      isAuthenticated={authState.isAuthenticated}
    />
  ) : undefined;

  const showBack = pathname !== '/';
  const backAction =
    overrideBackRoute ?? getDefaultBackRoute(pathname, searchParams);

  /** Navigates back using the backAction or browser history. */
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
        <AuthArea
          isLoading={isLoadingAuth}
          isAuthenticated={authState.isAuthenticated}
          indicator={indicator}
          displayName={displayName}
          guestAvatar={guestAvatar}
        />
      </div>

      <HeaderReminder
        isSessionUrgent={isSessionUrgent}
        session={sessionCard}
        research={researchCard}
      />

      {shouldShowSeeAll(hasSessionCard, isSessionUrgent, researchEligible) && (
        <div className='mt-1 flex justify-end'>
          <Link href='/schedule' className='text-[10px] text-[#2c2f35]'>
            See All
          </Link>
        </div>
      )}

      {isAdmin && (
        <AdminClinicCard
          isLoading={isClinicNameLoading}
          clinicName={clinicName}
        />
      )}
    </div>
  );
}
