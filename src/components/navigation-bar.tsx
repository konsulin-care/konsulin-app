'use client';

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';
import {
  ExerciseIcon,
  HouseIcon,
  LiteratureIcon,
  OfficeIcon,
  UserIcon
} from './icons';

function NavIcon({
  icon: Icon,
  isActive
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  isActive: boolean;
}) {
  return (
    <Icon
      fill={isActive ? '#13C2C2' : '#161C26'}
      strokeWidth={isActive ? 1.2 : 1}
    />
  );
}

/**
 *
 */
export default function NavigationBar({
  className
}: React.HTMLAttributes<HTMLDivElement>) {
  const pathname = usePathname();
  const activePathStyle = 'font-bold text-secondary';
  const pathStyle = 'text-[#161C26]';

  const { state: authState } = useAuth();
  const isPractitioner = authState.userInfo.role_name === Roles.Practitioner;

  const navItems = [
    {
      href: '/',
      isActive: pathname === '/',
      icon: HouseIcon,
      label: 'Home'
    },
    {
      href: isPractitioner ? '/schedule' : '/clinic',
      isActive:
        pathname?.startsWith('/clinic') || pathname?.startsWith('/schedule'),
      icon: OfficeIcon,
      label: 'Appointment'
    },
    {
      href: '/assessments',
      isActive: pathname?.startsWith('/assessments'),
      icon: LiteratureIcon,
      label: 'Assessments'
    },
    {
      href: '/exercise',
      isActive: pathname?.startsWith('/exercise'),
      icon: ExerciseIcon,
      label: 'Exercise'
    },
    {
      href: '/profile',
      isActive: pathname?.startsWith('/profile'),
      icon: UserIcon,
      label: 'Profile'
    }
  ];

  return (
    <div className={cn('absolute bottom-0', className)}>
      <div className='fixed bottom-0 z-10 flex h-[90px] w-full max-w-screen-sm justify-around bg-white px-[10px] py-[21px] shadow-[0px_-5px_15.1px_0px_#D7D7D740]'>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center',
              item.isActive ? activePathStyle : pathStyle
            )}
          >
            <NavIcon icon={item.icon} isActive={item.isActive} />
            <span className='mt-[5px] text-[12px]'>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
