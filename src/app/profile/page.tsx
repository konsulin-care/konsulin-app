'use client';

import Header from '@/components/header';
import { LoadingSpinnerIcon } from '@/components/icons';
import NavigationBar from '@/components/navigation-bar';
import { useAuth } from '@/context/auth/authContext';
import Clinician from './clinician';
import Patient from './patient';

export default function Profile() {
  const { state: authState, isLoading } = useAuth();

  const renderHomeContent = () => {
    return (
      <div className='mt-[-16px] rounded-[16px] bg-white pb-[100px] pt-4'>
        <div className='text-center'>
          {authState.userInfo.role_name === 'patient' && (
            <Patient fhirId={authState.userInfo.fhirId} />
          )}
          {authState.userInfo.role_name === 'clinician' && (
            <Clinician fhirId={authState.userInfo.fhirId} />
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <NavigationBar />
      <Header>
        <div className='flex'>
          <div className='my-2 flex flex-col'>
            <div className='text-[14px] font-bold text-white'>My Profile</div>
          </div>
        </div>
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        {isLoading ? (
          <div className='flex min-h-screen min-w-full items-center justify-center'>
            <LoadingSpinnerIcon
              width={56}
              height={56}
              className='w-full animate-spin'
            />
          </div>
        ) : (
          <div className='min-h-screen p-4'>{renderHomeContent()}</div>
        )}
      </div>
    </>
  );
}
