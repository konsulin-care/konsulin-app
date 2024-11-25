'use client'

import ContentWraper from '@/components/general/content-wraper'
import { useAuth } from '@/context/auth/authContext'
import HomeContentClinician from './home-content-clinician'
import HomeContentGuest from './home-content-guest'
import HomeContentPatient from './home-content-patient'

export default function HomeContent() {
  const { state: authState } = useAuth()

  return (
    <ContentWraper>
      {authState.userInfo.role_name === 'guest' && <HomeContentGuest />}
      {authState.userInfo.role_name === 'patient' && <HomeContentPatient />}
      {authState.userInfo.role_name === 'clinician' && <HomeContentClinician />}
    </ContentWraper>
  )
}
