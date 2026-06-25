'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/context/auth/authContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import EditPractice from './edit-practice';
import EditProfile from './edit-profile';
import ProfileDisplay from './profile-display';

/** Profile page with edit/view toggle for practitioner profile. */
const PathProfile = () => {
  const { state: authState, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const path = searchParams.get('path');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (path === 'edit-profile') {
      setTitle('Perbarui Profile');
    } else if (path === 'edit-practice') {
      setTitle('Perbarui Practice Information');
    }
  }, [path]);

  useEffect(() => {
    if (isLoading) return;
    if (!authState.isAuthenticated) {
      router.push('/auth');
    }
  }, [isLoading, authState.isAuthenticated, router]);

  if (path) {
    let component = null;

    if (path === 'edit-profile' && authState.userInfo) {
      component = (
        <EditProfile
          userRole={authState.userInfo.role_name}
          fhirId={authState.userInfo.fhirId}
        />
      );
    } else if (path === 'edit-practice') {
      component = <EditPractice />;
    }

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

    return (
      <>
        <PageHeader pageIndicator={title} />
        <div className='mt-[-24px] rounded-[16px] bg-white'>
          <div className='min-h-[calc(100vh-105px)] p-4'>{component}</div>
        </div>
      </>
    );
  }

  return <ProfileDisplay />;
};

export default PathProfile;
