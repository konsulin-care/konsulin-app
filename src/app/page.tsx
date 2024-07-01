'use client'

import Header from '@/components/header'
import { Button } from '@/components/ui/button'
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
      {!isAuthenticated ? (
        <Link href='/login'>
          <Button>Login</Button>
        </Link>
      ) : (
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
                Aji Si Patient
              </div>
            </div>
          </div>
        </Header>
      )}

      {/* RENDER CONTENT */}
      {renderHomeContent(userRole)}
    </div>
  )
}

function renderHomeContent(userRole: string) {
  switch (userRole) {
    case 'guest':
      return <p>Welcome, guest! You have limited access to the dashboard.</p>
    case 'patient':
      return (
        <div className='mt-[-24px] rounded-[16px] bg-white p-[16px]'>
          <div className='bg-slate-50 p-[16px]'>
            <div>chart</div>
          </div>
        </div>
      )
    case 'clinician':
      return <p>Halo clinician, ini tampilan khusus untuk clinician.</p>
    default:
      return <p>Welcome! Please login to access more features.</p>
  }
}

export default withAuth(Home, ['patient', 'clinician'], true)
