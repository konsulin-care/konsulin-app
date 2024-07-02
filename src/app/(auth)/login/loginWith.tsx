import { useRouter } from 'next/navigation'
import LoginMedia from '../../../components/login/media'

export default function LoginWithPage({ title, onClick }) {
  const router = useRouter()

  return (
    <div className='flex w-full flex-col items-center justify-center md:w-96'>
      <div className='flex h-1/2 w-full flex-col items-center justify-end space-y-4 pb-4 md:w-96'>
        <p className='text-xl font-semibold capitalize text-secondary'>
          Login Akun {title}
        </p>
        <button
          onClick={onClick}
          className='text-md border-1 w-full rounded-full border-primary bg-secondary p-4 capitalize text-white'
        >
          Masuk Dengan Username
        </button>
        <LoginMedia />
      </div>
      <p className='mb-12 w-full text-center text-sm md:w-96'>
        Belum punya akun?
        <span
          className='cursor-pointer text-[#13C2C2]'
          onClick={() => router.push('/register')}
        >
          &nbsp;Daftar Sekarang
        </span>
      </p>
    </div>
  )
}
