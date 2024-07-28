'use client'

import Input from '@/components/login/input'
import { apiRequest } from '@/services/api'
import { validateEmail } from '@/utils/validation'
import { useMutation } from '@tanstack/react-query'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ForgetPassword() {
  const [userEmail, setUserEmail] = useState('')
  const [errors, setErrors] = useState({ email: '' })
  const router = useRouter()
  const [countdown, setCountdown] = useState('09:00')
  const [isButtonDisabled, setIsButtonDisabled] = useState(false)

  const sendMailMutation = useMutation({
    mutationFn: async (email: typeof userEmail) => {
      try {
        const response = await apiRequest(
          'POST',
          '/api/v1/auth/forgot-password',
          { email }
        )
        return response
      } catch (err) {
        throw err
      }
    },
    onSuccess: () => {
      setIsButtonDisabled(true)
    }
  })

  useEffect(() => {
    let interval: any

    if (isButtonDisabled) {
      const countDownDate = new Date().getTime() + 9 * 60 * 1000
      interval = setInterval(() => {
        const now = new Date().getTime()
        const distance = countDownDate - now
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

        setCountdown(formattedTime)

        if (distance < 0) {
          clearInterval(interval)
          setCountdown('00:00')
          setIsButtonDisabled(false)
        }
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isButtonDisabled])

  function handleChangeInput(mail: string) {
    setUserEmail(mail)
    setErrors({ email: '' })
  }

  function handleSendMail() {
    if (!validateEmail(userEmail)) {
      setErrors({ email: 'Please enter a valid email address' })
      return
    }
    sendMailMutation.mutate(userEmail)
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
          className={`text-md border-1 w-full rounded-full border-primary ${isButtonDisabled ? 'bg-[#2C2F35] opacity-60' : 'bg-secondary'} p-4 font-semibold text-white`}
          type='submit'
          onClick={handleSendMail}
          disabled={isButtonDisabled}
        >
          Kirim Kode
        </button>
        <p className='w-full py-4 text-center text-sm'>
          Belum Menerima Kode?
          <span className='text-secondary'>&nbsp;{countdown}</span>
        </p>
      </div>
    </div>
  )
}
