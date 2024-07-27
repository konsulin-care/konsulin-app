'use client'

import Input from '@/components/login/input'
import { specialCharacter, upperCaseOneCharacter } from '@/utils/validation'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ResetPasswordForm() {
  const [userPassword, setUserPassword] = useState({
    password: '',
    confirmPassword: ''
  })

  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false
  })

  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: ''
  })

  const router = useRouter()

  function handleChangeInput(type: string, value: string) {
    setUserPassword(prevUserPassword => ({
      ...prevUserPassword,
      [type]: value
    }))

    setErrors({
      ...errors,
      [type]: ''
    })
  }

  function handleShowPassword(type: string) {
    setShowPassword(prevShowPassword => ({
      ...prevShowPassword,
      [type]: !showPassword[type]
    }))
  }

  function handleResetPassword() {
    const validationErrors = validateInputs()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    // TODO(harynp): will integration for reset password
    console.log('userPassword', userPassword)
  }

  function validateInputs() {
    const foundErrors = {
      password: '',
      confirmPassword: ''
    }

    const { password, confirmPassword } = userPassword
    if (!password) {
      foundErrors.password = 'Password is required'
    }
    // Check password length
    else if (password.length < 6) {
      foundErrors.password = 'Password must be at least 6 characters'
    } else if (!upperCaseOneCharacter(password)) {
      foundErrors.password =
        'Password must contain at least one uppercase letter'
    } else if (!specialCharacter(password)) {
      foundErrors.password =
        'Password must contain at least one number or special character'
    }

    if (!confirmPassword) {
      foundErrors.confirmPassword = 'Please confirm your password'
    } else if (confirmPassword !== password) {
      foundErrors.confirmPassword = 'Passwords do not match'
    }
    return foundErrors
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-between px-4 py-8'>
      <div className='flex h-3/4 w-full flex-grow flex-col justify-start'>
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
            prefixIcon={'/icons/lock.png'}
            suffixIcon={'/icons/eye.png'}
            placeholder='Masukan Password Baru'
            name='password'
            id='password'
            type={showPassword.password ? 'text' : 'password'}
            onChange={(event: any) =>
              handleChangeInput('password', event.target.value)
            }
            outline={false}
            className='mt-4 flex w-full items-center justify-between space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
            onShow={() => handleShowPassword('password')}
          />
          {errors.password && (
            <p className='w-full px-4 pt-1 text-left text-xs text-red-500'>
              {errors.password}
            </p>
          )}

          <Input
            prefixIcon={'/icons/lock.png'}
            suffixIcon={'/icons/eye.png'}
            placeholder='Konfirmasi Password Baru'
            name='confirmPassword'
            id='confirmPassword'
            type={showPassword.confirmPassword ? 'text' : 'password'}
            onChange={(event: any) =>
              handleChangeInput('confirmPassword', event.target.value)
            }
            outline={false}
            className='mt-4 flex w-full items-center justify-between space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
            onShow={() => handleShowPassword('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className='w-full px-4 pt-1 text-left text-xs text-red-500'>
              {errors.confirmPassword}
            </p>
          )}
        </div>
      </div>
      <div className='flex w-full flex-col items-center justify-end'>
        <button
          className='text-md border-1 my-4 w-full rounded-full border-primary bg-secondary p-4 font-semibold text-white'
          type='button'
          onClick={handleResetPassword}
        >
          Reset Ulang
        </button>
      </div>
    </div>
  )
}
