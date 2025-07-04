import { X } from 'lucide-react'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginMedia() {
  const [isDisabled, setIsDisabled] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerMessage, setDrawerMessage] = useState('')
  const router = useRouter()

  async function handleLoginBy(type: string) {
    switch (type) {
      case 'whatsapp':
        setDrawerMessage(
          'Fitur login WhatsApp sedang dalam pengembangan, silakan mendaftarkan akun menggunakan email.'
        )
        setIsDrawerOpen(true)
        console.log('Login via WhatsApp')
        break
      case 'google':
        try {
          const result = await signIn('google')
          if (result?.ok) {
            router.push('/')
          } else {
            return false
          }
        } catch (error) {
          return false
        }
        break
      default:
        console.warn(`Login type "${type}" is not supported.`)
    }
  }

  return (
    <>
      {isDrawerOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='relative m-4 w-full max-w-md rounded-lg bg-white p-4 p-6 shadow-lg'>
            <p className='text-center text-2xl font-semibold'>
              Dalam Pemeliharaan
            </p>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className='absolute right-3 top-3 p-1 text-gray-500 hover:text-gray-700'
            >
              <X size={24} />
            </button>
            <div className='flex flex-col items-center justify-center pt-8'>
              <div className='text-center text-lg text-gray-500'>
                {drawerMessage}
              </div>
            </div>
          </div>
        </div>
      )}
      <p className='flex w-full items-center'>
        <span className='flex-1 border-b border-[#EFEFEF]'></span>
        <span className='mx-4 text-xs opacity-40'>Atau Masuk Dengan</span>
        <span className='flex-1 border-b border-[#EFEFEF]'></span>
      </p>
      <div className='flex w-full items-center justify-between'>
        <button
          className={`flex w-1/2 cursor-pointer items-center justify-center space-x-[10px] rounded-[32px] border p-4 hover:bg-gray-100`}
          onClick={() => handleLoginBy('whatsapp')}
        >
          <Image
            width={24}
            height={24}
            src={'/icons/whatsapp.png'}
            alt='whatsapp-icon'
          />
          <p
            className={`text-sm ${isDisabled ? 'text-gray-400' : 'font-semibold text-[#13C2C2]'}`}
          >
            Whatsapp
          </p>
        </button>
        <div className='w-4'></div>
        <button
          className='flex w-1/2 cursor-pointer items-center justify-center space-x-[10px] rounded-[32px] border p-4'
          onClick={() => handleLoginBy('google')}
        >
          <Image
            width={24}
            height={24}
            src={'/icons/google.png'}
            alt='whatsapp-icon'
          />
          <p className='text-sm font-semibold text-[#13C2C2]'>Google</p>
        </button>
      </div>
    </>
  )
}
