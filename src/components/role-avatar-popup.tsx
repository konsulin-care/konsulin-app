/* eslint-disable complexity */
'use client';

import Avatar from '@/components/general/avatar';
import { HeaderText } from '@/components/role-avatar-popup-header';
import { AvatarInfo } from '@/components/role-avatar-popup-types';
import {
  buildOtherRoleAvatars,
  roleLabel
} from '@/components/role-avatar-popup-utils';
import { RoleSwitchDropdown } from '@/components/role-switch-dropdown';
import { useAuth } from '@/context/auth/authContext';
import { IStateAuth } from '@/context/auth/authTypes';
import { generateAvatarPlaceholder } from '@/utils/helper';
import Link from 'next/link';

/** Builds AvatarInfo for the current user and role. */
function getCurrentAvatar(
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
 * dropdown with the other roles' FHIR profile photos, sourced from the auth
 * state (`userInfo.roleProfiles`), which the auth bootstrap populates with a
 * single batch bundle. No component-level fetch happens here anymore; the
 * profile-save hooks keep the map fresh via optimistic auth-state updates.
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

  const profileMap = authState.userInfo?.roleProfiles;

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
      otherRoleAvatars={buildOtherRoleAvatars(roles, currentRole, profileMap)}
      currentAvatar={currentAvatar}
      roles={roles}
      indicator={indicator}
      displayName={displayName}
      onOpenChange={undefined}
    />
  );
}
