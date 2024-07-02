import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import Input from '../../../components/login/input'

export default function LoginFormInputPage({ role }) {
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

  function handleLoginSubmit(e) {
    e.preventDefault()
    const { username, password } = userData
    localStorage.setItem('token', `fake_token_${username}_${password}`)
    localStorage.setItem('userRole', role)
    const redirect = searchParams.get('redirect')
    router.push(redirect || '/login')
  }

  return (
    <>
      <div className='flex h-1/2 w-full flex-col items-center justify-center space-y-4 md:w-96'>
        <p className='text-xl font-semibold capitalize text-primary'>
          Masuk Dengan Username
        </p>
        <Input
          prefixIcon={'/icons/user.png'}
          placeholder='Masukan Nama Akun'
          name='username'
          id='username'
          type='text'
          onChange={event => handleChangeInput('username', event.target.value)}
          outline={false}
          className='flex w-full items-center space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
        />
        <Input
          prefixIcon={'/icons/lock.png'}
          suffixIcon={'/icons/eye.png'}
          placeholder='Masukan Password'
          name='password'
          id='password'
          type={showPassword ? 'text' : 'password'}
          onChange={event => handleChangeInput('password', event.target.value)}
          outline={false}
          className='flex w-full items-center justify-between space-x-[10px] rounded-[16px] border border-[#E3E3E3] p-4'
          onShow={handleShowPassword}
        />
        <p className='flex w-full cursor-pointer justify-end text-right text-xs font-semibold text-primary'>
          Lupa Password
        </p>

        <button
          className='text-md border-1 mb-4 w-full rounded-full border-primary bg-primary p-4 text-white'
          type='submit'
          onClick={handleLoginSubmit}
        >
          Masuk Sekarang
        </button>

        <p className='mb-[48px] w-full text-center text-sm md:w-96'>
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
