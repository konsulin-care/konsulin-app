'use client'

import Header from '@/components/header'
import NavigationBar from '@/components/navigation-bar'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LayoutSettings({ children }) {
  const router = useRouter()

  return (
    <NavigationBar>
      <Header showChat={false}>
        <div className='flex items-center space-x-2'>
          <ChevronLeft
            onClick={() => router.back()}
            color='white'
            width={30}
            height={30}
          />
          <p className='text-sm font-bold text-white'>Pengaturan</p>
        </div>
      </Header>
      {children}
    </NavigationBar>
  )
}
