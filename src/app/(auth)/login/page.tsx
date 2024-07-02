'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import LoginMedia from '../../../components/login/media'
import LoginFormInputPage from './loginForm'

export default function LoginPage() {
  const [title, setTitle] = useState('')
  const router = useRouter()
  const params = useSearchParams()
  const role = params.get('role')
  const withUsername = params.get('with')

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
        <div
          className={
            'flex h-1/2 w-full flex-col items-center justify-end space-y-4 pb-4 md:w-96'
          }
        >
          <p className='text-xl font-semibold capitalize text-primary'>
            Selamat Datang
          </p>
          <button className='text-md border-1 mt-20 w-full rounded-full border border-primary bg-primary p-4 capitalize text-primary text-white'>
            <Link href={{ pathname: '/login', query: { role: 'patient' } }}>
              Login Sebagai Pasien
            </Link>
          </button>
          <button className='text-md border-1 mt-20 w-full rounded-full border border-primary bg-white p-4 capitalize text-primary'>
            <Link href={{ pathname: '/login', query: { role: 'clinician' } }}>
              Login Sebagai Clinician
            </Link>
          </button>
        </div>
      )}
      {role && !withUsername && (
        <div className='flex w-full flex-col items-center justify-center md:w-96'>
          <div className='flex h-1/2 w-full flex-col items-center justify-end space-y-4 pb-4 md:w-96'>
            <p className='text-xl font-semibold capitalize text-primary'>
              Login Akun {title}
            </p>
            <button className='text-md border-1 w-full rounded-full border-primary bg-primary p-4 capitalize text-white'>
              <Link
                href={{
                  pathname: '/login',
                  query: {
                    role: role,
                    with: 'username'
                  }
                }}
              >
                Masuk Dengan Username
              </Link>
            </button>
            <LoginMedia />
          </div>
          <p className='mb-12 w-full text-center text-sm md:w-96'>
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
      {role && withUsername && <LoginFormInputPage role={role} />}
    </>
  )
}
