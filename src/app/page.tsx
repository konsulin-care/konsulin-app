'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';
import { useRedirectIntent } from '@/hooks/useRedirectIntent';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import HomeContent from './home-content';
import HomeHeader from './home-header';

/** Root app component displaying home header + content based on auth state. */
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
      <div className='mt-[-24px] flex min-h-screen min-w-full items-center justify-center rounded-b-[16px] bg-white pt-4 pb-20'>
        <LoadingSpinnerIcon
          width={60}
          height={60}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  return (
    <>
      <HomeHeader />
      <HomeContent />
    </>
  );
};

export default App;
