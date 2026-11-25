'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';

import HomeContent from '../home-content';
import HomeHeader from '../home-header';

/**
 * Dashboard route rendering the former home header and role home content.
 * Shows a loading spinner while auth state is resolving.
 * @returns The dashboard page element.
 */
export default function DashboardPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
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

  return (
    <>
      <HomeHeader />
      <HomeContent />
    </>
  );
}
