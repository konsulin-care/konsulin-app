'use client'

import Input from '@/components/login/input'
import LogoKonsulin from '@/components/login/logo'
import LoginMedia from '@/components/login/media'
import { apiRequest } from '@/services/api'
import {
  alphaNumeric,
  capitalizeFirstLetter,
  specialCharacter,
  upperCaseOneCharacter,
  validateEmail
} from '@/utils/validation'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'

export default function Register({ searchParams }) {
  const router = useRouter()
  const userType = searchParams?.role

  const { mutate, isLoading } = useMutation<any, unknown, typeof userRegister>({
    mutationFn: (newUser: typeof userRegister) => {
      return apiRequest('POST', `/api/v1/auth/register/${userType}`, newUser)
    },
    onSuccess: () => {
      console.log('Registration successful!')
      router.push('/login')
    }
  })

  const [userRegister, setUserRegister] = useState({
    email: '',
    username: '',
    password: '',
    retype_password: ''
  })

  const [showPassword, setShowPassword] = useState({
    password: false,
    retype_password: false
  })

  const [errors, setErrors] = useState({
    email: '',
    username: '',
    password: '',
    retype_password: ''
  })

  const [touchedFields, setTouchedFields] = useState({
    email: false,
    username: false,
    password: false,
    retype_password: false
  })

  function handleBlur(field: string) {
    setTouchedFields(prevTouchedFields => ({
      ...prevTouchedFields,
      [field]: true
    }))
    validateField(field, userRegister[field])
  }

  function validateField(field: string, value: string) {
    let newError: string | undefined = undefined

    switch (field) {
      case 'email':
        newError = validateEmail(value) ? undefined : 'Invalid email address'
        break

      case 'username':
        if (!value.trim()) {
          newError = 'Username is required'
        } else if (value.length < 8) {
          newError = 'Username must be at least 8 characters long'
        } else if (!alphaNumeric(value)) {
          newError = 'Username must contain only letters and numbers'
        }
        break

      case 'password':
        if (!value.trim()) {
          newError = 'Password is required'
        } else if (value.length < 8) {
          newError = 'Password must be at least 8 characters'
        } else if (!upperCaseOneCharacter(value)) {
          newError = 'Password must contain at least one uppercase letter'
        } else if (!specialCharacter(value)) {
          newError = 'Password must contain at least one special character'
        }
        break

      case 'retype_password':
        if (!value.trim()) {
          newError = 'Confirm password is required'
        } else if (value !== userRegister.password) {
          newError = 'Passwords do not match'
        }
        break

      default:
        newError = `${capitalizeFirstLetter(field)} is required`
    }

    setErrors(prevErrors => ({ ...prevErrors, [field]: newError }))
  }

  function handleChangeInput(key: string, value: string) {
    setUserRegister(prevUserRegister => ({
      ...prevUserRegister,
      [key]: value
    }))
    validateField(key, value)
  }

  function handleShowPassword(type: string) {
    setShowPassword(prevShowPassword => ({
      ...prevShowPassword,
      [type]: !showPassword[type]
    }))
  }

  function handleSubmitRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let isValid = true
    for (const key in userRegister) {
      const field = key
      validateField(field, userRegister[field])
      setTouchedFields(prev => ({ ...prev, [field]: true }))
      if (errors[field]) {
        isValid = false
      }
    }
    if (userRegister.password !== userRegister.retype_password) {
      setErrors(prevErrors => ({
        ...prevErrors,
        retype_password: 'Passwords do not match'
      }))
      isValid = false
    }

    if (isValid) {
      mutate(userRegister)
    }
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <form
        onSubmit={handleSubmitRegister}
        className='flex min-h-screen flex-col items-center justify-between p-4'
      >
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
            onBlur={() => handleBlur('email')}
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
          />
          {errors.email && touchedFields.email && (
            <p className='pl-4 text-[10px] text-red-500'>{errors.email}</p>
          )}
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
            onBlur={() => handleBlur('username')}
            outline={false}
            className='flex w-full items-center space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
          />
          {errors.username && touchedFields.username && (
            <p className='pl-4 text-[10px] text-red-500'>{errors.username}</p>
          )}
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
            onBlur={() => handleBlur('password')}
            outline={false}
            className='flex w-full items-center justify-between space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
            onShow={() => handleShowPassword('password')}
          />
          {errors.password && touchedFields.password && (
            <p className='pl-4 text-[10px] text-red-500'>{errors.password}</p>
          )}
          <Input
            prefixIcon={'/icons/lock.png'}
            suffixIcon={'/icons/eye.png'}
            placeholder='Masukan Password'
            name='retype_password'
            id='retype_password'
            required
            type={showPassword.retype_password ? 'text' : 'password'}
            onChange={(event: any) =>
              handleChangeInput('retype_password', event.target.value)
            }
            onBlur={() => handleBlur('retype_password')}
            outline={false}
            className='flex w-full items-center justify-between space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
            onShow={() => handleShowPassword('retype_password')}
          />
          {errors.retype_password && touchedFields.retype_password && (
            <p className='pl-4 text-[10px] text-red-500'>
              {errors.retype_password}
            </p>
          )}
          <div className='pt-8'>
            <button
              className='text-md border-1 my-4 w-full rounded-full border-primary bg-secondary p-4 text-white'
              type='submit'
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Daftar Akun'}
            </button>
          </div>
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
      </form>
    </Suspense>
  )
}
