import Input from '@/components/login/input'
import { useAuth } from '@/context/auth/authContext'
import { apiRequest } from '@/services/api'
import {
  alphaNumeric,
  capitalizeFirstLetter,
  specialCharacter,
  upperCaseOneCharacter
} from '@/utils/validation'
import { useMutation } from '@tanstack/react-query'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

interface LoginResponse {
  success: boolean
  message: string
  data: {
    token: string
    user: {
      name: string
      email: string
      user_id: string
      role_id: string
      role_name: string
    }
  }
}

function LoginFormContent({ role }) {
  const { dispatch } = useAuth()

  const [userData, setUserData] = useState({
    username: '',
    password: ''
  })

  const [touchedFields, setTouchedFields] = useState({
    username: false,
    password: false
  })

  const [errors, setErrors] = useState({
    username: '',
    password: ''
  })

  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  const { mutate, isPending } = useMutation<
    LoginResponse,
    unknown,
    typeof userData
  >({
    mutationFn: async (newUser: typeof userData) => {
      try {
        const response: LoginResponse = await apiRequest(
          'POST',
          `/api/v1/auth/login/${role}`,
          newUser
        )
        return response
      } catch (err) {
        throw err
      }
    },
    onSuccess: response => {
      const userType =
        response.data.user.role_name === 'patient'
          ? 'patient'
          : response.data.user.role_name === 'practitioner'
            ? 'clinician'
            : 'guest'
      dispatch({
        type: 'login',
        payload: {
          token: response.data.token,
          role_name: userType,
          name: response.data.user.name
        }
      })
      const redirect = searchParams.get('redirect')
      router.push(redirect || '/')
    }
  })

  function handleShowPassword() {
    setShowPassword(!showPassword)
  }

  function handleChangeInput(key: string, value: string) {
    setUserData(prevUserData => ({
      ...prevUserData,
      [key]: value
    }))
    validateField(key, value)
  }

  function handleBlur(field: string) {
    setTouchedFields(prevTouchedFields => ({
      ...prevTouchedFields,
      [field]: true
    }))
    validateField(field, userData[field])
  }

  function validateField(field: string, value: string) {
    let newError: string | undefined = undefined

    switch (field) {
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
      default:
        newError = `${capitalizeFirstLetter(field)} is required`
    }

    setErrors(prevErrors => ({ ...prevErrors, [field]: newError }))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let isValid = true
    for (const key in userData) {
      const field = key
      validateField(field, userData[field])
      setTouchedFields(prev => ({ ...prev, [field]: true }))
      if (errors[field]) {
        isValid = false
      }
    }

    if (isValid) {
      mutate(userData)
    }
  }

  return (
    <form
      className='flex h-1/2 w-full flex-col items-center justify-center'
      onSubmit={handleSubmit}
    >
      <div className='flex w-full flex-col'>
        <p className='py-4 text-center text-xl font-bold capitalize text-secondary'>
          Masuk Dengan Username
        </p>
        <Input
          prefixIcon='/icons/user.png'
          placeholder='Masukan Nama Akun'
          name='username'
          id='username'
          type='text'
          value={userData.username}
          onChange={(event: any) =>
            handleChangeInput('username', event.target.value)
          }
          onBlur={() => handleBlur('username')}
          outline={false}
          className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
        />
        {errors.username && touchedFields.username && (
          <p className='mt-1 pl-4 text-xs text-red-500'>{errors.username}</p>
        )}
        <Input
          prefixIcon='/icons/lock.png'
          suffixIcon='/icons/eye.png'
          placeholder='Masukan Password'
          name='password'
          id='password'
          type={showPassword ? 'text' : 'password'}
          value={userData.password}
          onChange={(event: any) =>
            handleChangeInput('password', event.target.value)
          }
          onBlur={() => handleBlur('password')}
          outline={false}
          className='mb-1 mt-4 flex w-full items-center justify-between space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          onShow={handleShowPassword}
        />
        {errors.password && touchedFields.password && (
          <p className='mt-1 pl-4 text-xs text-red-500'>{errors.password}</p>
        )}
        <p className='flex w-full cursor-pointer justify-end text-right text-xs font-semibold text-secondary'>
          <Link href='/forget-password'>Lupa Password</Link>
        </p>

        <button
          className='text-md border-1 my-4 w-full rounded-full border-primary bg-secondary p-4 font-semibold text-white'
          type='submit'
          disabled={isPending}
        >
          {isPending ? 'Loading...' : 'Masuk Sekarang'}
        </button>

        <p className='mb-[48px] w-full text-center text-sm'>
          Belum punya akun?
          <span
            className='cursor-pointer text-[#13C2C2]'
            onClick={() => router.push(`/register?role=${role}`)}
          >
            &nbsp;Daftar Sekarang
          </span>
        </p>
      </div>
    </form>
  )
}

export default function LoginForm({ role }) {
  return (
    <Suspense>
      <LoginFormContent role={role} />
    </Suspense>
  )
}
