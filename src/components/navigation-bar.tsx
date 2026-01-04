'use client';

import { useAuth } from '@/context/auth/authContext';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ExerciseIcon,
  HouseIcon,
  LiteratureIcon,
  OfficeIcon,
  UserIcon
} from './icons';

export default function NavigationBar({
  children,
  className
}: React.HTMLAttributes<HTMLDivElement>) {
  const pathname = usePathname();
  const activePathStyle = 'font-bold text-secondary';
  const pathStyle = 'text-[#161C26]';

  const { state: authState } = useAuth();

  return (
    <div className={cn('absolute bottom-0', className)}>
      {/* {children} */}
      <div className='fixed bottom-0 z-10 flex h-[90px] w-full max-w-screen-sm justify-around bg-white px-[10px] py-[21px] shadow-[0px_-5px_15.1px_0px_#D7D7D740]'>
        <Link
          href={'/'}
          className={cn(
            `flex flex-col items-center`,
            pathname === '/' ? activePathStyle : pathStyle
          )}
        >
          <HouseIcon
            fill={pathname === '/' ? '#13C2C2' : '#161C26'}
            strokeWidth={pathname === '/' ? 1.2 : 1}
          />
          <span className='mt-[5px] text-[12px]'>Home</span>
        </Link>
        <Link
          href={
            authState.userInfo.role_name === 'practitioner'
              ? '/schedule'
              : '/clinic'
          }
          className={cn(
            `flex flex-col items-center`,
            pathname?.startsWith('/clinic') || pathname?.startsWith('/schedule')
              ? activePathStyle
              : pathStyle
          )}
        >
          <OfficeIcon
            fill={
              pathname?.startsWith('/clinic') ||
              pathname?.startsWith('/schedule')
                ? '#13C2C2'
                : '#161C26'
            }
            strokeWidth={
              pathname?.startsWith('/clinic') ||
              pathname?.startsWith('/schedule')
                ? 1.2
                : 1
            }
          />

          <span className='mt-[5px] text-[12px]'>Appointment</span>
        </Link>
        <Link
          href={'/assessments'}
          className={cn(
            `flex flex-col items-center`,
            pathname?.startsWith('/assessments') ? activePathStyle : pathStyle
          )}
        >
          <LiteratureIcon
            fill={pathname?.startsWith('/assessments') ? '#13C2C2' : '#161C26'}
            strokeWidth={pathname?.startsWith('/assessments') ? 1.2 : 1}
          />

          <span className='mt-[5px] text-[12px]'>Assessments</span>
        </Link>
        <Link
          href={'/exercise'}
          className={cn(
            `flex flex-col items-center`,
            pathname?.startsWith('/exercise') ? activePathStyle : pathStyle
          )}
        >
          <ExerciseIcon
            fill={pathname?.startsWith('/exercise') ? '#13C2C2' : '#161C26'}
            strokeWidth={pathname?.startsWith('/exercise') ? 1.2 : 1}
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
          <UserIcon
            fill={pathname === '/profile' ? '#13C2C2' : '#161C26'}
            strokeWidth={pathname === '/profile' ? 1.2 : 1}
          />
          <span className='mt-[5px] text-[12px]'>Profile</span>
        </Link>
      </div>
    </div>
  );
}
