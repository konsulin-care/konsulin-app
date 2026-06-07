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
import { fetchCSRFToken } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { HeaderText } from '@/components/role-avatar-popup-header';
import { AvatarInfo } from '@/components/role-avatar-popup-types';
import { roleLabel } from '@/components/role-avatar-popup-utils';
import { StackedCircles } from '@/components/stacked-circles';

async function switchRole(role: string): Promise<void> {
  try {
    const token = await fetchCSRFToken();
    const res = await fetch('/auth/role/switch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(token ? { 'X-CSRF-Token': token } : {})
      },
      body: new URLSearchParams({ role })
    });
    if (res.ok) window.location.href = '/';
  } catch {
    // role switch failed silently
  }
}

function RoleSwitchMenuItems({
  otherRoleAvatars
}: Readonly<{
  otherRoleAvatars: (AvatarInfo & { role: string })[];
}>) {
  if (otherRoleAvatars.length === 0) return null;
  return (
    <>
      <DropdownSeparator />
      {otherRoleAvatars.map(info => (
        <DropdownItem
          key={info.role}
          className='cursor-pointer'
          onClick={() => switchRole(info.role)}
        >
          <Avatar
            seed={info.seed}
            initials={info.initials}
            backgroundColor={info.backgroundColor}
            photoUrl={info.photoUrl}
            height={24}
            width={24}
            className='mr-3 text-[10px]'
            imageClassName='self-center'
          />
          <span className='text-sm font-medium text-[#2c2f35]'>
            {roleLabel(info.role)}
          </span>
        </DropdownItem>
      ))}
    </>
  );
}

interface RoleSwitchDropdownProps {
  otherRoleAvatars: (AvatarInfo & { role: string })[];
  currentAvatar: AvatarInfo;
  roles: string[];
  indicator?: string;
  displayName?: string;
  onOpenChange: (open: boolean) => void;
}

export function RoleSwitchDropdown({
  otherRoleAvatars,
  currentAvatar,
  roles,
  indicator,
  displayName,
  onOpenChange
}: Readonly<RoleSwitchDropdownProps>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const handleProfileClick = useCallback(
    () => router.push('/profile'),
    [router]
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={isOpen => {
        setOpen(isOpen);
        onOpenChange(isOpen);
      }}
    >
      <DropdownTrigger asChild>
        <div className='flex cursor-pointer items-center gap-2'>
          <HeaderText indicator={indicator} displayName={displayName} />
          <StackedCircles
            roles={roles}
            currentAvatar={currentAvatar}
            otherRoleAvatars={otherRoleAvatars}
          />
        </div>
      </DropdownTrigger>
      <DropdownContent align='end' sideOffset={8} className='bg-white'>
        <DropdownItem className='cursor-pointer' onClick={handleProfileClick}>
          <UserIcon className='mr-3 h-4 w-4 text-[#2c2f35]' />
          <span className='text-sm font-medium text-[#2c2f35]'>Profile</span>
        </DropdownItem>
        <RoleSwitchMenuItems otherRoleAvatars={otherRoleAvatars} />
      </DropdownContent>
    </Dropdown>
  );
}
