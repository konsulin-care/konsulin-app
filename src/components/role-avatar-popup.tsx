/* eslint-disable complexity */
'use client';

import Avatar from '@/components/general/avatar';
import { HeaderText } from '@/components/role-avatar-popup-header';
import { AvatarInfo } from '@/components/role-avatar-popup-types';
import { roleLabel } from '@/components/role-avatar-popup-utils';
import { RoleSwitchDropdown } from '@/components/role-switch-dropdown';
import { useAuth } from '@/context/auth/authContext';
import { IStateAuth } from '@/context/auth/authTypes';
import { generateAvatarPlaceholder } from '@/utils/helper';
import Link from 'next/link';

/**
 * Builds the avatar placeholder data for the current user and role.
 *
 * @param role - Active role name, used as display-name fallback and seed
 * @param userId - Fallback seed when the profile has no FHIR id
 * @param authState - Current auth state holding the user profile
 * @returns Avatar seed, initials, background colour and photo URL
 */
export function getCurrentAvatar(
  role: string | undefined,
  userId: string,
  authState: IStateAuth
): AvatarInfo {
  const displayName =
    authState?.userInfo?.fullname || (role ? roleLabel(role) : '');
  const seed = authState?.userInfo?.fhirId || userId || role || '';
  const placeholder = generateAvatarPlaceholder({
    id: seed,
    name: displayName,
    email: authState?.userInfo?.email
  });
  return {
    seed: placeholder.seed,
    initials: placeholder.initials ?? '',
    backgroundColor: placeholder.backgroundColor ?? '',
    photoUrl: authState?.userInfo?.profile_picture || ''
  };
}

/**
 * Header avatar for the active user.
 *
 * Single-role users keep a plain link to /profile. Multi-role users get a
 * dropdown listing the other roles as icon + label — the role profile
 * pictures are intentionally not shown since they are the same for every
 * role of the account.
 */
export default function RoleAvatarPopup({
  indicator,
  displayName
}: Readonly<{
  indicator?: string;
  displayName?: string;
}>) {
  const { state: authState } = useAuth();
  const roles = authState.userInfo?.roles ?? [];
  const currentRole = authState.userInfo?.role_name;
  const userId = authState.userInfo?.userId ?? '';
  const currentAvatar = getCurrentAvatar(currentRole, userId, authState);
  const otherRoles = roles.filter(role => role !== currentRole);

  if (roles.length <= 1) {
    return (
      <Link href='/profile' className='flex items-center gap-2'>
        <HeaderText indicator={indicator} displayName={displayName} />
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
      </Link>
    );
  }

  return (
    <RoleSwitchDropdown
      otherRoles={otherRoles}
      currentAvatar={currentAvatar}
      indicator={indicator}
      displayName={displayName}
      onOpenChange={undefined}
    />
  );
}
