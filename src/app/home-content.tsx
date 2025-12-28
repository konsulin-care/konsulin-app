'use client';

import ContentWraper from '@/components/general/content-wraper';
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import HomeContentClinician from './home-content-clinician';
import HomeContentGuest from './home-content-guest';
import HomeContentPatient from './home-content-patient';

export default function HomeContent() {
  const { state: authState } = useAuth();

  return (
    <ContentWraper>
      {authState.userInfo.role_name === Roles.Guest && <HomeContentGuest />}
      {authState.userInfo.role_name === Roles.Patient && <HomeContentPatient />}
      {authState.userInfo.role_name === Roles.Practitioner && (
        <HomeContentClinician />
      )}
    </ContentWraper>
  );
}
