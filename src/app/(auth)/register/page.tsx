'use client'

import Input from '@/components/login/input'
import LogoKonsulin from '@/components/login/logo'
import LoginMedia from '@/components/login/media'
import { apiRequest } from '@/services/api'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface FormValues {
  email: string
  username: string
  password: string
  retype_password: string
}

interface FormErrors {
  email?: string
  username?: string
  password?: string
  retype_password?: string
}

interface Errors {
  [key: string]: string
}

export default function Register({ searchParams }) {
  const router = useRouter()
  const userType = searchParams?.role

  const [formValues, setFormValues] = useState<FormValues>({
    email: '',
    username: '',
    password: '',
    retype_password: ''
  })

  const { mutate, isLoading } = useMutation<any, unknown, FormValues>({
    mutationFn: (newUser: FormValues) => {
      return apiRequest('POST', `/api/v1/auth/register/${userType}`, newUser)
    },
    onSuccess: () => {
      console.log('Registration successful!')
      router.push('/login')
    }
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState({
    password: false,
    retype_password: false
  })

  function validatePassword(password: string) {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
  }

  const validateField = (name: string, value: string) => {
    let error = ''
    switch (name) {
      case 'email':
        const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.[a-zA-Z]+$/
        if (!value) error = 'Email tidak boleh kosong'
        else if (!emailRegex.test(value)) error = 'Format email tidak valid'
        break
      case 'username':
        const usernameRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]+$/
        if (!value) error = 'Username tidak boleh kosong'
        else if (!usernameRegex.test(value))
          error = 'Username harus berupa kombinasi huruf dan angka saja'
        break
      case 'password':
        const passwordRequirements = ''
        if (!value) error = 'Password tidak boleh kosong'
        else if (
          value.length < 8 ||
          !/[A-Z]/.test(value) ||
          !/[0-9]/.test(value) ||
          !/[!@#$%^&*]/.test(value)
        ) {
          error = passwordRequirements
        }
        break
      case 'retype_password':
        if (!value) error = 'Konfirmasi password tidak boleh kosong'
        else if (value !== formValues.password) error = 'Password tidak cocok'
        break
      default:
        break
    }
    setErrors((prev: Errors) => ({ ...prev, [name]: error }))
  }

  const handleChangeInput = (name: string, value: string) => {
    setFormValues(prev => ({ ...prev, [name]: value }))
    validateField(name, value)
  }

  const handleShowPassword = (field: string) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const isFormValid =
    Object.values(errors).every(error => !error) &&
    Object.values(formValues).every(value => value)

  const handleSubmitRegister = (event: any) => {
    event.preventDefault()
    mutate(formValues)
  }

  const passwordRequirements = validatePassword(formValues.password)
  return (
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
          onChange={event => handleChangeInput('email', event.target.value)}
          outline={false}
          className='flex w-full items-center space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
        />
        {errors.email && (
          <p className='pl-4 text-xs text-red-500'>{errors.email}</p>
        )}
        <Input
          id='username'
          prefixIcon={'/icons/user.png'}
          placeholder='Masukan Nama Akun'
          name='username'
          type='text'
          required
          onChange={event => handleChangeInput('username', event.target.value)}
          outline={false}
          className='flex w-full items-center space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
        />
        {errors.username && (
          <p className='pl-4 text-xs text-red-500'>{errors.username}</p>
        )}
        <Input
          prefixIcon={'/icons/lock.png'}
          suffixIcon={'/icons/eye.png'}
          placeholder='Masukan Password'
          name='password'
          id='password'
          required
          type={showPassword.password ? 'text' : 'password'}
          onChange={event => handleChangeInput('password', event.target.value)}
          outline={false}
          className='flex w-full items-center justify-between space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
          onShow={() => handleShowPassword('password')}
        />
        <ul
          className={`flex flex-col gap-1 px-4 text-sm ${formValues.password.length > 0 ? '' : 'hidden'}`}
        >
          <li className='flex items-center text-xs'>
            <span
              className={
                passwordRequirements.length ? 'text-green-500' : 'text-red-500'
              }
            >
              {passwordRequirements.length ? '✔️' : '❌'}
            </span>
            <span
              className={
                passwordRequirements.length
                  ? 'ml-2 text-green-500'
                  : 'ml-2 text-red-500'
              }
            >
              Password harus minimal 8 karakter
            </span>
          </li>
          <li className='flex items-center text-xs'>
            <span
              className={
                passwordRequirements.uppercase
                  ? 'text-green-500'
                  : 'text-red-500'
              }
            >
              {passwordRequirements.uppercase ? '✔️' : '❌'}
            </span>
            <span
              className={
                passwordRequirements.uppercase
                  ? 'ml-2 text-green-500'
                  : 'ml-2 text-red-500'
              }
            >
              Password minimal 1 karakter huruf besar
            </span>
          </li>
          <li className='flex items-center text-xs'>
            <span
              className={
                passwordRequirements.number ? 'text-green-500' : 'text-red-500'
              }
            >
              {passwordRequirements.number ? '✔️' : '❌'}
            </span>
            <span
              className={
                passwordRequirements.number
                  ? 'ml-2 text-green-500'
                  : 'ml-2 text-red-500'
              }
            >
              Password minimal 1 angka
            </span>
          </li>
          <li className='flex items-center text-xs'>
            <span
              className={
                passwordRequirements.specialChar
                  ? 'text-green-500'
                  : 'text-red-500'
              }
            >
              {passwordRequirements.specialChar ? '✔️' : '❌'}
            </span>
            <span
              className={
                passwordRequirements.specialChar
                  ? 'ml-2 text-green-500'
                  : 'ml-2 text-red-500'
              }
            >
              Password minimal 1 spesial karakter
            </span>
          </li>
        </ul>
        {errors.password && (
          <p className='pl-4 text-xs text-red-500'>{errors.password}</p>
        )}
        <Input
          prefixIcon={'/icons/lock.png'}
          suffixIcon={'/icons/eye.png'}
          placeholder='Masukan Password'
          name='retype_password'
          id='retype_password'
          required
          type={showPassword.retype_password ? 'text' : 'password'}
          onChange={event =>
            handleChangeInput('retype_password', event.target.value)
          }
          outline={false}
          className='flex w-full items-center justify-between space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
          onShow={() => handleShowPassword('retype_password')}
        />
        {errors.retype_password && (
          <p className='pl-4 text-xs text-red-500'>{errors.retype_password}</p>
        )}
        <div className='pt-8'>
          <button
            className={`text-md mb-4 w-full rounded-full p-4 ${!isFormValid || isLoading ? 'cursor-not-allowed bg-gray-100' : 'bg-secondary text-white'}`}
            type='submit'
            disabled={!isFormValid || isLoading}
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
  )
}
