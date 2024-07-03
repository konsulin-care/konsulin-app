'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import LoginMedia from '../../../components/login/media'
import LoginForm from './loginForm'

function LoginContent() {
  const [title, setTitle] = useState('')
  const router = useRouter()
  const params = useSearchParams()
  const role = params.get('role')
  const withUsername = params.get('with')

  function handleUserRole(role: string) {
    router.push(`/login?role=${role}`)
  }

  function handleLoginWith(via: string) {
    router.push(`/login?role=${role}&with=${via}`)
  }

  useEffect(() => {
    if (role) {
      setTitle(role === 'patient' ? 'Pasien' : 'Clinician')
    } else {
      setTitle('')
    }
  }, [role])

  return (
    <>
      {!role && (
        <div className='flex h-1/2 w-full flex-col items-center justify-end space-y-4 pb-4'>
          <p className='text-xl font-bold capitalize text-secondary'>
            Selamat Datang
          </p>
          <button
            className='text-md border-1 mt-20 w-full rounded-full bg-secondary p-4 font-semibold capitalize text-primary text-white'
            onClick={() => handleUserRole('patient')}
          >
            Login Sebagai Pasien
          </button>
          <button
            className='text-md border-1 mt-20 w-full rounded-full border border-[#EFEFEF] bg-white p-4 font-semibold capitalize text-secondary'
            onClick={() => handleUserRole('clinician')}
          >
            Login Sebagai Clinician
          </button>
        </div>
      )}
      {role && !withUsername && (
        <div className='flex w-full flex-col items-center justify-center'>
          <div className='flex h-1/2 w-full flex-col items-center justify-end space-y-4 pb-4'>
            <p className='text-xl font-bold capitalize text-secondary'>
              Login Akun {title}
            </p>
            <button
              onClick={() => handleLoginWith('username')}
              className='text-md border-1 w-full rounded-full border-primary bg-secondary p-4 font-semibold capitalize text-white'
            >
              Masuk Dengan Username
            </button>
            <LoginMedia />
          </div>
          <p className='mb-12 w-full text-center text-sm'>
            Belum punya akun?
            <span
              className='cursor-pointer text-[#13C2C2]'
              onClick={() => router.push('/register')}
            >
              &nbsp;Daftar Sekarang
            </span>
          </p>
        </div>
      )}
      {role && withUsername && <LoginForm role={role} />}
    </>
  )
}

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
