'use client'

import { useRouter, useSearchParams } from 'next/navigation'

import { useEffect, useState } from 'react'

export default function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [username, setusername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (localStorage.getItem('token')) {
      router.push('/')
    }
  }, [])

  const login = () => {
    const redirect = searchParams.get('redirect')
    router.push(redirect || '/')
    localStorage.setItem('token', `fake_token_${username}_${password}`)
    localStorage.setItem('userRole', 'patient')
  }

  return (
    <div className='flex flex-col gap-2 p-2'>
      <input
        className='border'
        onChange={e => setusername(e.target.value)}
        type='text'
      />
      <input
        className='border'
        onChange={e => setPassword(e.target.value)}
        type='password'
      />
      <button className='border' onClick={login} type='submit'>
        login
      </button>
    </div>
  )
}
