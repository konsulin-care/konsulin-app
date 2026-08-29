'use client';

import ContentWraper from '@/components/general/content-wraper';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import HomeContentAdmin from './home-content-admin';
import PractitionerDashboard from './practitioner-dashboard';
import HomeContentGuest from './home-content-guest';
import HomeContentPatient from './home-content-patient';

/**
 *
 */
export default function HomeContent() {
  const { state: authState } = useAuth();

  return (
    <ContentWraper
      className={
        authState.userInfo.role_name === Roles.Guest
          ? 'min-h-0 pb-4'
          : undefined
      }
    >
      {authState.userInfo.role_name === Roles.Guest && <HomeContentGuest />}
      {authState.userInfo.role_name === Roles.Patient && <HomeContentPatient />}
      {authState.userInfo.role_name === Roles.Practitioner && (
        <PractitionerDashboard />
      )}
      {authState.userInfo.role_name === Roles.ClinicAdmin && (
        <HomeContentAdmin />
      )}
      {authState.userInfo.role_name &&
        !(Object.values(Roles) as string[]).includes(
          authState.userInfo.role_name
        ) && (
          <div className='flex min-h-[40vh] items-center justify-center p-4 text-center text-gray-500'>
            Unable to load content for this role.
          </div>
        )}
    </ContentWraper>
  );
}
