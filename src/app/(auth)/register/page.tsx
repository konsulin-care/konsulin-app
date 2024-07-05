'use client'

import Input from '@/components/login/input'
import LogoKonsulin from '@/components/login/logo'
import LoginMedia from '@/components/login/media'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function Register() {
  const [userRegister, setUserRegister] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  })

  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false
  })

  const router = useRouter()

  function handleChangeInput(key: string, value: string) {
    setUserRegister(prevUserRegister => ({
      ...prevUserRegister,
      [key]: value
    }))
  }

  function handleShowPassword(type: string) {
    setShowPassword(prevShowPassword => ({
      ...prevShowPassword,
      [type]: !showPassword[type]
    }))
  }

  function handleSubmitRegister() {
    console.log(userRegister) // TODO(harynp): Integrate registration API from state userRegister
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-between p-4'>
      <div className='flex flex-grow items-center justify-center'>
        <LogoKonsulin width={201} height={150} className='object-fit' />
      </div>
      <div className='w-full space-y-4'>
        <p className='text-center text-xl font-semibold capitalize text-secondary'>
          Daftar Akun
        </p>
        <Input
          id='email'
          prefixIcon={'/icons/user.png'}
          placeholder='Masukan Email'
          name='email'
          type='email'
          required
          onChange={(event: any) =>
            handleChangeInput('email', event.target.value)
          }
          outline={false}
          className='flex w-full items-center space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
        />
        <Input
          id='username'
          prefixIcon={'/icons/user.png'}
          placeholder='Masukan Nama Akun'
          name='username'
          type='text'
          required
          onChange={(event: any) =>
            handleChangeInput('username', event.target.value)
          }
          outline={false}
          className='flex w-full items-center space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
        />
        <Input
          prefixIcon={'/icons/lock.png'}
          suffixIcon={'/icons/eye.png'}
          placeholder='Masukan Password'
          name='password'
          id='password'
          required
          type={showPassword.password ? 'text' : 'password'}
          onChange={(event: any) =>
            handleChangeInput('password', event.target.value)
          }
          outline={false}
          className='flex w-full items-center justify-between space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
          onShow={() => handleShowPassword('password')}
        />
        <Input
          prefixIcon={'/icons/lock.png'}
          suffixIcon={'/icons/eye.png'}
          placeholder='Masukan Password'
          name='confirmPassword'
          id='confirmPassword'
          required
          type={showPassword.confirmPassword ? 'text' : 'password'}
          onChange={(event: any) =>
            handleChangeInput('confirmPassword', event.target.value)
          }
          outline={false}
          className='flex w-full items-center justify-between space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
          onShow={() => handleShowPassword('confirmPassword')}
        />
        <button
          className='text-md border-1 my-4 w-full rounded-full border-primary bg-secondary p-4 text-white'
          type='submit'
          onClick={handleSubmitRegister}
        >
          Daftar Akun
        </button>
        <LoginMedia />
        <p className='w-full pb-12 text-center text-sm'>
          Sudah punya akun?
          <span
            className='cursor-pointer text-[#13C2C2]'
            onClick={() => router.push('/login')}
          >
            &nbsp;Masuk Sekarang
          </span>
        </p>
      </div>
    </div>
  )
}
