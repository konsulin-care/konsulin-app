'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import Clinician from './clinician'
import Patient from './patient'

const Profile: React.FC<IWithAuth> = ({ userRole, isAuthenticated }) => {
  const renderHomeContent = () => {
    return (
      <div className='mt-[-16px] rounded-[16px] bg-white pt-4'>
        <div className='text-center'>
          {userRole === 'patient' && <Patient />}
          {userRole === 'clinician' && <Clinician />}
        </div>
      </div>
    )
  }

  return (
    <NavigationBar>
      <Header>
        {!isAuthenticated ? (
          <div className='mt-5'></div>
        ) : (
          <div className='flex'>
            <div className='my-2 flex flex-col'>
              <div className='text-[14px] font-bold text-white'>My Profile</div>
            </div>
          </div>
        )}
      </Header>
      <div className='mt-[-24px] rounded-[16px] bg-white'>
        <div className='min-h-screen p-4'>{renderHomeContent()}</div>
      </div>
    </NavigationBar>
  )
}

export default withAuth(Profile, ['patient', 'clinician'])
