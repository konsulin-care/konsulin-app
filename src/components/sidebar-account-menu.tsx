'use client';

import Avatar from '@/components/general/avatar';
import { UserIcon } from '@/components/icons';
import {
  DropdownMenu as Dropdown,
  DropdownMenuContent as DropdownContent,
  DropdownMenuItem as DropdownItem,
  DropdownMenuSeparator as DropdownSeparator,
  DropdownMenuTrigger as DropdownTrigger
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/auth/authContext';
import { useTranslations } from '@/i18n';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { getCurrentAvatar } from './role-avatar-popup';
import { roleLabel } from './role-avatar-popup-utils';
import { RoleSwitchMenuItems } from './role-switch-dropdown';

/**
 * Account area at the bottom of the app sidebar.
 *
 * Signed-in users get an avatar trigger (name and role visible from lg) that
 * opens Profile, the other roles and Log out. Anonymous visitors get a plain
 * Sign in link. Logout itself is handled by the /logout confirmation route.
 *
 * @returns The account menu, or a Sign in link while unauthenticated
 */
export default function SidebarAccountMenu() {
  const t = useTranslations('page-header');
  const { state: authState, isLoading } = useAuth();
  const isAuthenticated = authState?.isAuthenticated ?? false;

  if (isLoading || !isAuthenticated) {
    return (
      <Link
        href='/auth'
        className='text-foreground hover:bg-muted flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors lg:justify-start'
      >
        {t('sign_in')}
      </Link>
    );
  }

  const userInfo = authState.userInfo;
  const currentRole = userInfo?.role_name;
  const userId = userInfo?.userId ?? '';
  const displayName =
    userInfo?.fullname || (currentRole ? roleLabel(currentRole) : '');
  const currentAvatar = getCurrentAvatar(currentRole, userId, authState);
  const otherRoles = (userInfo?.roles ?? []).filter(
    role => role !== currentRole
  );

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button
          type='button'
          aria-label={t('account_menu')}
          className='hover:bg-muted flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md px-1 py-2 transition-colors lg:justify-start lg:px-3'
        >
          <Avatar
            seed={currentAvatar.seed}
            initials={currentAvatar.initials}
            backgroundColor={currentAvatar.backgroundColor}
            photoUrl={currentAvatar.photoUrl}
            height={32}
            width={32}
            className='text-xs'
            imageClassName='self-center'
          />
          <span className='hidden lg:block'>
            <span className='text-foreground block truncate text-sm font-semibold'>
              {displayName}
            </span>
            <span className='text-muted-foreground block truncate text-xs'>
              {currentRole ? roleLabel(currentRole) : ''}
            </span>
          </span>
        </button>
      </DropdownTrigger>
      <DropdownContent align='end' side='right' className='bg-card w-56'>
        <DropdownItem className='cursor-pointer p-0'>
          <Link
            href='/profile'
            className='flex w-full items-center px-2 py-1.5'
          >
            <UserIcon className='text-foreground mr-3 h-4 w-4' />
            <span className='text-foreground text-sm font-medium'>
              {t('profile')}
            </span>
          </Link>
        </DropdownItem>
        <RoleSwitchMenuItems otherRoles={otherRoles} />
        <DropdownSeparator />
        <DropdownItem className='cursor-pointer p-0'>
          <Link href='/logout' className='flex w-full items-center px-2 py-1.5'>
            <LogOut className='text-foreground mr-3 h-4 w-4' />
            <span className='text-foreground text-sm font-medium'>
              {t('log_out')}
            </span>
          </Link>
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
