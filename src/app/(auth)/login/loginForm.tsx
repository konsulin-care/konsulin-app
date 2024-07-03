import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import Input from '../../../components/login/input'

function LoginFormContent({ role }) {
  const [userData, setUserData] = useState({
    username: '',
    password: ''
  })

  const [showPassword, setShowPassword] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()

  function handleShowPassword() {
    setShowPassword(!showPassword)
  }

  function handleChangeInput(key, value) {
    setUserData(prevStateUser => ({
      ...prevStateUser,
      [key]: value
    }))
  }

  function handleLoginSubmit(e: any) {
    e.preventDefault()
    const { username, password } = userData
    localStorage.setItem('token', `fake_token_${username}_${password}`)
    localStorage.setItem('userRole', role)
    const redirect = searchParams.get('redirect')
    router.push(redirect || '/')
  }

  return (
    <>
      <div className='flex h-1/2 w-full flex-col items-center justify-center'>
        <p className='py-4 text-xl font-bold capitalize text-secondary'>
          Masuk Dengan Username
        </p>
        <Input
          prefixIcon={'/icons/user.png'}
          placeholder='Masukan Nama Akun'
          name='username'
          id='username'
          type='text'
          onChange={(event: any) =>
            handleChangeInput('username', event.target.value)
          }
          outline={false}
          className='flex w-full items-center space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
        />
        <Input
          prefixIcon={'/icons/lock.png'}
          suffixIcon={'/icons/eye.png'}
          placeholder='Masukan Password'
          name='password'
          id='password'
          type={showPassword ? 'text' : 'password'}
          onChange={(event: any) =>
            handleChangeInput('password', event.target.value)
          }
          outline={false}
          className='mb-1 mt-4 flex w-full items-center justify-between space-x-[10px] rounded-lg border border-[#E3E3E3] p-4'
          onShow={handleShowPassword}
        />
        <p className='flex w-full cursor-pointer justify-end text-right text-xs font-semibold text-secondary'>
          Lupa Password
        </p>

        <button
          className='text-md border-1 my-4 w-full rounded-full border-primary bg-secondary p-4 font-semibold text-white'
          type='submit'
          onClick={handleLoginSubmit}
        >
          Masuk Sekarang
        </button>

        <p className='mb-[48px] w-full text-center text-sm'>
          Belum punya akun?
          <span
            className='cursor-pointer text-[#13C2C2]'
            onClick={() => router.push('/register')}
          >
            &nbsp;Daftar Sekarang
          </span>
        </p>
      </div>
    </>
  )
}

export default function LoginForm({ role }) {
  return (
    <Suspense>
      <LoginFormContent role={role} />
    </Suspense>
  )
}
