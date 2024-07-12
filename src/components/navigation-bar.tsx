import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ExceriseIcon,
  HouseIcon,
  LiteratureIcon,
  OfficeIcon,
  UserIcon
} from './icons'

export default function NavigationBar({ children }) {
  const pathname = usePathname()
  const activePathStyle = 'font-bold text-secondary'
  const pathStyle = 'text-[#ADB6C7]'

  return (
    <div className='pb-[100px]'>
      {children}
      <div className='fixed bottom-0 flex h-[90px] w-full max-w-screen-sm justify-around bg-white px-[10px] py-[21px] shadow-[0px_-5px_15.1px_0px_#D7D7D740]'>
        <Link
          href={'/'}
          className={cn(
            `flex flex-col items-center`,
            pathname === '/' ? activePathStyle : pathStyle
          )}
        >
          <HouseIcon fill={pathname === '/' ? '#13C2C2' : '#ADB6C7'} />
          <span className='mt-[5px] text-[12px]'>Beranda</span>
        </Link>
        <Link
          href={'/session'}
          className={cn(
            `flex flex-col items-center`,
            pathname?.startsWith('/session') ? activePathStyle : pathStyle
          )}
        >
          <OfficeIcon fill={pathname === '/session' ? '#13C2C2' : '#ADB6C7'} />

          <span className='mt-[5px] text-[12px]'>Sesi Temu</span>
        </Link>
        <Link
          href={'/assessment'}
          className={cn(
            `flex flex-col items-center`,
            pathname?.startsWith('/assessment') ? activePathStyle : pathStyle
          )}
        >
          <LiteratureIcon
            fill={pathname === '/assessment' ? '#13C2C2' : '#ADB6C7'}
          />

          <span className='mt-[5px] text-[12px]'>Assesment</span>
        </Link>
        <Link
          href={'/exercise'}
          className={cn(
            `flex flex-col items-center`,
            pathname?.startsWith('/exercise') ? activePathStyle : pathStyle
          )}
        >
          <ExceriseIcon
            fill={pathname === '/exercise' ? '#13C2C2' : '#ADB6C7'}
          />

          <span className='mt-[5px] text-[12px]'>Exercise</span>
        </Link>
        <Link
          href={'/profile'}
          className={cn(
            `flex flex-col items-center`,
            pathname?.startsWith('/profile') ? activePathStyle : pathStyle
          )}
        >
          <UserIcon fill={pathname === '/profile' ? '#13C2C2' : '#ADB6C7'} />
          <span className='mt-[5px] text-[12px]'>Profile</span>
        </Link>
      </div>
    </div>
  )
}
