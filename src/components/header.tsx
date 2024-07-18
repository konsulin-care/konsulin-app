import Image from 'next/image'
import Link from 'next/link'
import { ReactNode } from 'react'

interface HeaderProps {
  showChat?: boolean
  showNotification?: boolean
  children: ReactNode
}

export default function Header({
  showChat = true,
  showNotification = true,
  children
}: HeaderProps) {
  return (
    <div
      className={`bg-[#08979C] bg-[url('/images/nav-banner.svg')] bg-right bg-no-repeat`}
    >
      <div className='relative flex items-start justify-between p-[16px] pb-[40px]'>
        {children}
        <div className='absolute right-4 top-4 flex gap-[8px]'>
          {showChat && (
            <Link href='/'>
              <Image
                width={32}
                height={32}
                alt='offline'
                src={'/icons/message-square-chat.svg'}
              />
            </Link>
          )}
          {showNotification && (
            <Link href='/'>
              <Image
                width={32}
                height={32}
                alt='offline'
                src={'/icons/bell-alt.svg'}
              />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
