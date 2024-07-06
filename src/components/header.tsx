import Image from 'next/image'
import { ReactNode } from 'react'

interface HeaderProps {
  showChat?: boolean
  children: ReactNode
}

export default function Header({ showChat = true, children }: HeaderProps) {
  return (
    <div
      className={`bg-secondary bg-[url('/images/nav-banner.svg')] bg-right-top bg-no-repeat`}
    >
      <div className='flex items-start justify-between p-[16px] pb-[40px]'>
        {children}
        <div className='flex gap-[8px]'>
          {showChat && (
            <Image
              width={24}
              height={24}
              alt='offline'
              src={'/icons/message-square-chat.svg'}
            />
          )}
          <Image
            width={24}
            height={24}
            alt='offline'
            src={'/icons/bell-alt.svg'}
          />
        </div>
      </div>
    </div>
  )
}
