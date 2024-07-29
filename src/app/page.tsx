'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import withAuth, { IWithAuth } from '@/hooks/withAuth'

import Image from 'next/image'
import AppClinician from './app-clinician'
import AppGuest from './app-guest'
import AppPatient from './app-patient'

const App: React.FC<IWithAuth> = ({ userRole, isAuthenticated }) => {
  const renderHomeContent = () => {
    switch (userRole) {
      case 'patient':
        return <AppPatient />
      case 'clinician':
        return <AppClinician />
      default: // guest
        return <AppGuest />
    }
  }

  return (
    <NavigationBar>
      <Header showChat={isAuthenticated} showNotification={isAuthenticated}>
        {!isAuthenticated ? (
          <div className='flex flex-col'>
            <div className='text-[14px] font-bold text-white'>Konsulin</div>
          </div>
        ) : (
          <div className='flex'>
            <Image
              className='mr-2 h-[32px] w-[32px] self-center rounded-full object-cover'
              width={32}
              height={32}
              alt='offline'
              src={'/images/avatar.jpg'}
            />
            <div className='flex flex-col'>
              <div className='text-[10px] font-normal text-white'>
                Selamat Datang di Dashboard anda
              </div>
              <div className='text-[14px] font-bold text-white'>
                Aji Si {userRole}
              </div>
            </div>
          </div>
        )}
      </Header>
      {renderHomeContent()}
    </NavigationBar>
  )
}

export default withAuth(App, ['patient', 'clinician'], true)
