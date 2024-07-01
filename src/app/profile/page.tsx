'use client'

import withAuth from '@/hooks/useAuth'
import Link from 'next/link'
import { useState } from 'react'

const Profile: React.FC<{ userRole: string }> = ({ userRole }) => {
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

  return (
    <div>
      <h1>Profile Page</h1>
      <Link href='/logout'>
        <button>logout</button>
      </Link>

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
  )
}

export default withAuth(Profile, ['patient', 'clinician'])
