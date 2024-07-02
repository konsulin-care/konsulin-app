'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { Button } from '@/components/ui/button'
import withAuth from '@/hooks/useAuth'
import Link from 'next/link'
import { useState } from 'react'

const Profile: React.FC<{ userRole: any }> = ({ userRole }) => {
  const [profile, setProfile] = useState<any>()

  /**
   * FETCH DATA
   */
  // useEffect(() => {
  //   API.get('/profile').then((res: any) => {
  //     if (res.code === 200) {
  //       setProfile(res.data)
  //     }
  //   })
  // }, [])

  const renderHomeContent = () => {
    return (
      <div className='mt-[-24px] rounded-[16px] bg-white p-4'>
        <Link href='/logout'>
          <Button className='w-full bg-secondary text-white'>logout</Button>
        </Link>

        <div className='mt-2 text-center'>
          {userRole === 'patient' && (
            <div>
              <p>Halo patient, ini tampilan khusus untuk patient.</p>
            </div>
          )}
          {userRole === 'clinician' && (
            <div>
              <p>Halo clinician, ini tampilan khusus untuk clinician.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <NavigationBar>
        <Header>
          <div className='text-[14px] font-bold text-white'>My Profile</div>
        </Header>
        {renderHomeContent()}
      </NavigationBar>
    </div>
  )
}

export default withAuth(Profile, ['patient', 'clinician'])
