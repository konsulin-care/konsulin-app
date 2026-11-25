'use client';
/* eslint-disable @typescript-eslint/no-floating-promises */

import { LoadingSpinnerIcon } from '@/components/icons';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useRedirectIntent } from '@/hooks/useRedirectIntent';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import HomeContent from './home-content';
import HomeHeader from './home-header';
import ResearchPage from './research/research-page';

/**
 * Root app component: role-based home after resolving auth.
 *
 * Practitioners and clinic admins keep the home header and content; every
 * other role (patient, guest, researcher, unauthenticated) gets the research
 * page as the home destination.
 */
const App = () => {
  const { isLoading, state: authState } = useAuth();
  const queryClient = useQueryClient();
  const { isRedirecting } = useRedirectIntent({ isLoading, authState });
  const previousRoleRef = useRef(authState?.userInfo?.role_name);

  // Invalidate all React Query caches when the user's role changes
  useEffect(() => {
    const currentRole = authState?.userInfo?.role_name;
    if (previousRoleRef.current && previousRoleRef.current !== currentRole) {
      queryClient.invalidateQueries();
    }
    previousRoleRef.current = currentRole;
  }, [authState?.userInfo?.role_name, queryClient]);

  if (isLoading || isRedirecting) {
    return (
      <div className='bg-card mt-[-24px] flex min-h-screen min-w-full items-center justify-center rounded-b-[16px] pt-4 pb-20'>
        <LoadingSpinnerIcon
          width={60}
          height={60}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  const role = authState?.userInfo?.role_name;
  const usesHomeDashboard =
    role === Roles.Practitioner || role === Roles.ClinicAdmin;

  if (!usesHomeDashboard) return <ResearchPage />;

  return (
    <>
      <HomeHeader />
      <HomeContent />
    </>
  );
};

export default App;
