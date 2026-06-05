'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import NavigationBar from '@/components/navigation-bar';
import { useAuth } from '@/context/auth/authContext';
import { useRedirectIntent } from '@/hooks/useRedirectIntent';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import HomeContent from './home-content';
import HomeHeader from './home-header';

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
      <div className='mt-[-24px] flex min-h-screen min-w-full items-center justify-center rounded-b-[16px] bg-white pt-4 pb-[100px]'>
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
      <NavigationBar />
      <HomeHeader />
      <HomeContent />
    </>
  );
};

export default App;
