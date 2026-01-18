'use client';

import Header from '@/components/header';
import { LoadingSpinnerIcon } from '@/components/icons';
import { useAuth } from '@/context/auth/authContext';
import { ChevronLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import EditPractice from './edit-practice';
import EditProfile from './edit-profile';

const PathProfile = () => {
  const { state: authState, isLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const path = params.path;
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
      <div className='mt-[-24px] flex min-h-screen min-w-full items-center justify-center rounded-[16px] bg-white pt-4 pb-[100px]'>
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
      <Header showChat={false} showNotification={false}>
        {!authState.isAuthenticated ? (
          <div className='mt-8'></div>
        ) : (
          <div className='mb-[-5px] flex w-full items-center justify-between'>
            <ChevronLeft
              width={32}
              height={32}
              onClick={() => router.back()}
              color='white'
              className='cursor-pointer'
            />
            <div className='my-2 flex flex-grow'>
              <span className='w-full pr-6 text-center text-[14px] font-bold text-white'>
                {title}
              </span>
            </div>
          </div>
        )}
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        <div className='min-h-[calc(100vh-105px)] p-4'>{component}</div>
      </div>
    </>
  );
};

export default PathProfile;
