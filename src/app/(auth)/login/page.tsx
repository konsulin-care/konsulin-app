'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
      <Input
        onChange={e => setusername(e.target.value)}
        type='text'
        placeholder='username'
      />
      <Input
        onChange={e => setPassword(e.target.value)}
        type='password'
        placeholder='Password'
      />
      <Button onClick={login}>Button</Button>
    </div>
  )
}
