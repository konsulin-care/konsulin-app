'use client'

import NavigationBar from '@/components/navigation-bar'
import Header from '@/components/profile/header'
import withAuth, { IWithAuth } from '@/hooks/withAuth'
import { useParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import EditPratice from './edit-pratice'
import EditProfile from './edit-profile'

const PathProfile: React.FC<IWithAuth> = ({ userRole }) => {
  const params = useParams()
  const path = params.path
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (path === 'edit-profile') {
      setTitle('Perbarui Profile')
    } else if (path === 'edit-pratice') {
      setTitle('Perbarui Pratice Information')
    }
  }, [path])

  let component = null

  if (path === 'edit-profile') {
    component = <EditProfile userRole={userRole} />
  } else if (path === 'edit-pratice') {
    component = <EditPratice />
  } else {
    // Handle other paths
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NavigationBar>
        <Header title={title} />
        {component}
      </NavigationBar>
    </Suspense>
  )
}

export default withAuth(PathProfile, ['patient', 'clinician'])
