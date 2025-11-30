'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import NavigationBar from '@/components/navigation-bar';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import PatientRecord from './patient-record';
import PractitionerRecord from './practitioner-record';

export default function Record() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const renderHomeContent = (
    <>
      {authState.userInfo.role_name === Roles.Patient && <PatientRecord />}

      {authState.userInfo.role_name === Roles.Practitioner && (
        <PractitionerRecord />
      )}
    </>
  );

  return (
    <>
      <NavigationBar />
      {isAuthLoading ? (
        <div className='flex min-h-screen min-w-full items-center justify-center'>
          <LoadingSpinnerIcon
            width={56}
            height={56}
            className='w-full animate-spin'
          />
        </div>
      ) : (
        renderHomeContent
      )}
    </>
  );
}
