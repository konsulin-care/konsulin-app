'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoginFormInputPage from './form'
import LoginWithPage from './loginWith'
import OnBoardingPage from './onboard'

export default function Login() {
  const [userData, setUserData] = useState({
    role: '',
    title: ''
  })
  const [isLoginByUsername, setIsLoginByUsername] = useState(false)

  const router = useRouter()

  function handleLoginUserRole(role: string) {
    const updateTitle = role === 'patient' ? 'Pasien' : 'Clinician'
    setUserData(prevUser => ({
      ...prevUser,
      role: role,
      title: updateTitle
    }))
  }

  function handleLoginByUsername() {
    setIsLoginByUsername(true)
  }

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.push('/')
    }
  }, [])

  return (
    <>
      {!userData.role && (
        <OnBoardingPage title='Selamat Datang' onClick={handleLoginUserRole} />
      )}
      {userData.role && !isLoginByUsername && (
        <LoginWithPage title={userData.title} onClick={handleLoginByUsername} />
      )}
      {isLoginByUsername && <LoginFormInputPage role={userData.role} />}
    </>
  )
}
