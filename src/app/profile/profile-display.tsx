'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import PageHeader from '@/components/page-header';
import CompletenessBanner from '@/components/profile/completeness-banner';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import Clinician from './clinician';
import Patient from './patient';

/**
 *
 */
export default function ProfileDisplay() {
  const { state: authState, isLoading } = useAuth();
  const { showBanner } = useProfileCompleteness();

  /** Render the patient or clinician profile based on role. */
  const renderHomeContent = () => {
    return (
      <div className='mt-[-16px] rounded-[16px] bg-white pt-4 pb-20'>
        <div className='text-center'>
          {authState.userInfo.role_name === Roles.Patient && (
            <Patient fhirId={authState.userInfo.fhirId} />
          )}
          {authState.userInfo.role_name === Roles.Practitioner && (
            <Clinician fhirId={authState.userInfo.fhirId} />
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader />
      {!isLoading && <CompletenessBanner show={showBanner} />}
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
