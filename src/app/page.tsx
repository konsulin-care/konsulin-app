'use client'

import Header from '@/components/header'
import withAuth from '@/hooks/useAuth'
import Image from 'next/image'
import Link from 'next/link'

interface HomeProps {
  userRole: string
  isAuthenticated: boolean
}

const Home: React.FC<HomeProps> = ({ userRole, isAuthenticated }) => {
  return (
    <div className='flex h-screen flex-col'>
      <Header>
        <div className='flex'>
          <Image
            className='mr-[8px] h-[32px] w-[32px] rounded-full object-cover'
            width={32}
            height={32}
            alt='offline'
            src={'/images/avatar.jpg'}
          />
          <div className='flex flex-col'>
            <div className='text-[10px] font-normal text-white'>
              Selamat Datang di Dashboard anda
            </div>
            <div className='text-[14px] font-bold text-white'>
              Aji Danuarta Gold Premium
            </div>
          </div>
        </div>
      </Header>

      {/* CONTENT */}
      <div className='mt-[-24px] rounded-[16px] bg-white p-[16px]'>
        <div className='bg-slate-50 p-[16px]'>
          <div>chart</div>
        </div>
      </div>

      {!isAuthenticated ? (
        <Link href='/login'>
          <button>Login</button>
        </Link>
      ) : (
        <Link href='/logout'>
          <button>Logout</button>
        </Link>
      )}

      {renderHomeContent(userRole)}
    </div>
  )
}

function renderHomeContent(userRole: string) {
  switch (userRole) {
    case 'guest':
      return <p>Welcome, guest! You have limited access to the dashboard.</p>
    case 'patient':
      return <p>Halo patient, ini tampilan khusus untuk patient! .</p>
    case 'clinician':
      return <p>Halo clinician, ini tampilan khusus untuk clinician.</p>
    default:
      return <p>Welcome! Please login to access more features.</p>
  }
}

export default withAuth(Home, ['patient', 'clinician'], true)
