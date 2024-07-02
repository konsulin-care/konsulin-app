import Image from 'next/image'

export default function LoginMedia() {
  function handleLoginBy(type) {
    switch (type) {
      case 'whatsapp':
        console.log('Login via whatsapp') // TODO(harynp): integration for auth via whatsapp
        break
      case 'google':
        console.log('Login via google') // TODO(harynp): integration for auth via google
        break
    }
  }

  return (
    <>
      <p className='flex w-full items-center'>
        <span className='flex-1 border-b border-[#EFEFEF]'></span>
        <span className='mx-4 text-xs opacity-40'>Atau Masuk Dengan</span>
        <span className='flex-1 border-b border-[#EFEFEF]'></span>
      </p>
      <div className='flex w-full items-center justify-between'>
        <button
          className='flex w-1/2 cursor-pointer items-center justify-center space-x-[10px] rounded-[32px] border p-4'
          onClick={() => handleLoginBy('whatsapp')}
        >
          <Image
            width={24}
            height={24}
            src={'/icons/whatsapp.png'}
            alt='whatsapp-icon'
          />
          <p className='text-sm font-semibold text-[#13C2C2]'>Whatsapp</p>
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
