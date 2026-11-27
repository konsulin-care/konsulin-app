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
import {
  getDefaultBackRoute,
  getDisplayName,
  getPageIndicator,
  isResearchHome,
  normalizePathname,
  shouldHideSessionCard
} from '@/components/page-header-utils';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useUpcomingEvents } from '@/hooks/useUpcomingEvents';
import { useTranslations } from '@/i18n';
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

const BACK_BUTTON_CLASS =
  'text-foreground absolute left-0 flex h-10 w-10 items-center justify-center';

/** Renders the header back navigation link or history button. */
function HeaderBackButton({
  show,
  backAction,
  label,
  onBack
}: Readonly<{
  show: boolean;
  backAction: string | undefined;
  label: string;
  onBack: () => void;
}>) {
  if (!show) return null;
  if (backAction) {
    return (
      <a href={backAction} aria-label={label} className={BACK_BUTTON_CLASS}>
        <ChevronLeftIcon size={24} aria-hidden='true' />
      </a>
    );
  }
  return (
    <button
      type='button'
      aria-label={label}
      onClick={onBack}
      className={BACK_BUTTON_CLASS}
    >
      <ChevronLeftIcon size={24} aria-hidden='true' />
    </button>
  );
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
  const pathname = normalizePathname(usePathname());
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state: authState, isLoading: isLoadingAuth } = useAuth();
  const { appointmentData, sessionData } = useUpcomingEvents();

  const role = authState.userInfo.role_name;
  const isPatient = role === Roles.Patient;
  const isAdmin = role === Roles.ClinicAdmin;
  const researchHome = isResearchHome(
    pathname,
    role,
    authState.isAuthenticated
  );

  const t = useTranslations('page-header');
  const indicator =
    overrideIndicator ??
    getPageIndicator(pathname, searchParams, t, researchHome) ??
    '';

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

  const hideSessionCard = shouldHideSessionCard(
    pathname,
    researchHome,
    hideUpcomingSession
  );
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

  return (
    <div className='bg-background px-4 pt-4 pb-8'>
      <div className='relative flex items-center justify-end'>
        <HeaderBackButton
          show={showBack}
          backAction={backAction}
          label={t('go_back')}
          onBack={() => router.back()}
        />
        {indicator && (
          <div className='text-foreground hidden text-sm font-bold md:block'>
            {indicator}
          </div>
        )}
        <div className='md:hidden'>
          <AuthArea
            isLoading={isLoadingAuth}
            isAuthenticated={authState.isAuthenticated}
            indicator={indicator}
            displayName={displayName}
            guestAvatar={guestAvatar}
          />
        </div>
      </div>

      <HeaderReminder
        isSessionUrgent={isSessionUrgent}
        session={sessionCard}
        research={researchCard}
      />

      {shouldShowSeeAll(hasSessionCard, isSessionUrgent, researchEligible) && (
        <div className='mt-1 flex justify-end'>
          <Link href='/schedule' className='text-foreground text-xs'>
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
