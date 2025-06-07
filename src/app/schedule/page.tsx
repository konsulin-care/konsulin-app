'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import NavigationBar from '@/components/navigation-bar';
import { useAuth } from '@/context/auth/authContext';
import SchedulePatient from './schedule-patient';
import SchedulePractitioner from './schedule-practitioner';

export default function Schedule() {
  const { state: authState, isLoading: isAuthLoading } = useAuth();

  const renderHomeContent = () => {
    return (
      <>
        {authState.userInfo.role_name === 'patient' && (
          <SchedulePatient fhirId={authState.userInfo.fhirId} />
        )}

        {authState.userInfo.role_name === 'practitioner' && (
          <SchedulePractitioner fhirId={authState.userInfo.fhirId} />
        )}
      </>
    );
  };

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
        <>{renderHomeContent()}</>
      )}
    </>
  );
}
