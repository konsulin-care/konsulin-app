'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ProfileDisplay from './profile-display';

/**
 * Profile page — auth-gated. Renders the unified profile display for all
 * registered roles (Patient, Practitioner, Clinic Admin, Researcher).
 * Guests are redirected to /auth.
 */
const ProfilePage = () => {
  const { state: authState, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!authState.isAuthenticated) {
      router.push('/auth');
    }
  }, [isLoading, authState.isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className='mt-[-24px] flex min-h-screen min-w-full items-center justify-center rounded-[16px] bg-white pt-4 pb-20'>
        <LoadingSpinnerIcon
          width={60}
          height={60}
          className='w-full animate-spin'
        />
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return null;
  }

  return <ProfileDisplay />;
};

export default ProfilePage;
