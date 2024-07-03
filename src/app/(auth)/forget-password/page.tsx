'use client'

import Input from '@/components/login/input'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ForgetPassword() {
  const [userEmail, setUserEmail] = useState('')
  const [errors, setErrors] = useState({ email: '' })
  const router = useRouter()

  function handleChangeInput(mail: string) {
    setUserEmail(mail)
    setErrors({ email: '' })
  }

  function validateEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  function handleLoginSubmit() {
    if (!validateEmail(userEmail)) {
      setErrors({ email: 'Please enter a valid email address' })
      return
    }
    router.push('/reset-password')
  }

  return (
    <div className='flex h-screen flex-col items-center justify-between px-4 py-8'>
      <div className='flex w-full flex-grow flex-col justify-start'>
        <div className='px-5 py-4'>
          <Image
            width={8}
            height={16}
            src={'icons/chevron-left.svg'}
            alt='chevron-left-logo'
            onClick={() => router.back()}
          />
        </div>
        <div className='mt-28 flex w-full flex-col items-center justify-center'>
          <Image
            width={200}
            height={200}
            src={'images/lock-forgot.svg'}
            alt='forgot-password-lock'
          />
          <p className='pb-2 pt-4 text-xl font-bold capitalize text-secondary'>
            Reset Ulang Password
          </p>
          <p className='text-center text-xs text-[#2C2F35] opacity-60'>
            Unfortunately we can’t recover your old password,
            <br />
            but you can reset your
          </p>
          <Input
            prefixIcon={'/icons/email.svg'}
            placeholder='Masukan Email'
            name='email'
            id='email'
            type='email'
            onChange={(event: any) => handleChangeInput(event.target.value)}
            outline={false}
            className={`${errors.email ? 'mt-4' : 'my-4'} flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4`}
          />
          {errors.email && (
            <p className='w-full px-4 pb-2 pt-1 text-left text-xs text-red-500'>
              {errors.email}
            </p>
          )}
          <p className='text-center text-xs text-[#2C2F35] opacity-60'>
            Verify your email and phone number below <br />
            and we will send you the reset password link.
          </p>
        </div>
      </div>
      <div className='flex w-full flex-grow flex-col items-center justify-end'>
        <button
          className='text-md border-1 w-full rounded-full border-primary bg-secondary p-4 font-semibold text-white'
          type='submit'
          onClick={handleLoginSubmit}
        >
          Kirim Kode
        </button>
      </div>
    </div>
  )
}
