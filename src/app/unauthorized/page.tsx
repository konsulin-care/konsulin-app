'use client'

import { RotateCw } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function Unauthorized() {
  const router = useRouter()

  console.log({ env: process.env.NODE_ENV })

  return (
    <div className='container flex flex-col items-center'>
      <Image
        className='mt-32'
        width={250}
        height={250}
        alt='offline'
        src={'/images/Fast-Internet.svg'}
      />
      <h2 className='mt-2 text-center font-mono text-2xl font-semibold'>
        Unauthorized Access!
      </h2>
      <p className='text-sm opacity-50'>
        Sorry, you dont have access for this page.
      </p>

      <button
        className='mt-8 cursor-pointer'
        type='button'
        onClick={() => router.push('/')}
      >
        <div className='flex items-center'>
          <span className='font-mono text-2xl font-semibold underline'>
            Go to Home Page
          </span>
          <RotateCw className='ml-2' width={21} height={21} />
        </div>
      </button>
    </div>
  )
}
