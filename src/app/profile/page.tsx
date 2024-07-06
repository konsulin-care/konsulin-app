'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import Clinician from './clinician'
import Patient from './patient'

const Profile: React.FC<IWithAuth> = ({ userRole }) => {
  /**
   * FETCH DATA
   */
  // const [profile, setProfile] = useState<any>()
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
        <div className='text-center'>
          {userRole === 'patient' && <Patient />}
          {userRole === 'clinician' && <Clinician />}
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
