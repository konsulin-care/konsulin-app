'use client';
/* eslint-disable @typescript-eslint/no-misused-promises */

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
import { roleIcon, roleLabel } from '@/components/role-avatar-popup-utils';
import { StackedCircles } from '@/components/stacked-circles';

/** Switches the active user role via API call and reloads. */
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
    if (res.ok) globalThis.location.href = '/';
  } catch {
    // role switch failed silently
  }
}

/** Renders dropdown menu items for switching to other roles. */
function RoleSwitchMenuItems({
  otherRoles
}: Readonly<{
  otherRoles: string[];
}>) {
  if (otherRoles.length === 0) return null;
  return (
    <>
      <DropdownSeparator />
      {otherRoles.map(role => {
        const Icon = roleIcon(role);
        return (
          <DropdownItem
            key={role}
            className='cursor-pointer'
            onClick={() => switchRole(role)}
          >
            <Icon className='mr-3 h-4 w-4 text-[#2c2f35]' />
            <span className='text-sm font-medium text-[#2c2f35]'>
              {roleLabel(role)}
            </span>
          </DropdownItem>
        );
      })}
    </>
  );
}

interface RoleSwitchDropdownProps {
  /** Roles other than the active one, shown as switch targets. */
  otherRoles: string[];
  currentAvatar: AvatarInfo;
  indicator?: string;
  displayName?: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Role switcher for multi-role users: current avatar + stacked depth cue in
 * the trigger, and a dropdown listing the other roles as icon + label.
 */
export function RoleSwitchDropdown({
  otherRoles,
  currentAvatar,
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
        onOpenChange?.(isOpen);
      }}
    >
      <DropdownTrigger asChild>
        <div className='flex cursor-pointer items-center gap-2'>
          <HeaderText indicator={indicator} displayName={displayName} />
          <StackedCircles
            currentAvatar={currentAvatar}
            hasMultipleRoles={otherRoles.length > 0}
          />
        </div>
      </DropdownTrigger>
      <DropdownContent align='end' sideOffset={8} className='bg-white'>
        <DropdownItem className='cursor-pointer' onClick={handleProfileClick}>
          <UserIcon className='mr-3 h-4 w-4 text-[#2c2f35]' />
          <span className='text-sm font-medium text-[#2c2f35]'>Profile</span>
        </DropdownItem>
        <RoleSwitchMenuItems otherRoles={otherRoles} />
      </DropdownContent>
    </Dropdown>
  );
}
