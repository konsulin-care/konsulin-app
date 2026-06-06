'use client';

import Avatar from '@/components/general/avatar';
import { HeaderText } from '@/components/role-avatar-popup-header';
import { AvatarInfo } from '@/components/role-avatar-popup-types';
import { roleLabel } from '@/components/role-avatar-popup-utils';
import { RoleSwitchDropdown } from '@/components/role-switch-dropdown';
import { useAuth } from '@/context/auth/authContext';
import { IStateAuth } from '@/context/auth/authTypes';
import {
  fetchRoleProfiles,
  RoleProfile,
  RoleProfileMap
} from '@/services/batch-profile';
import { generateAvatarPlaceholder } from '@/utils/helper';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';

function getCurrentAvatar(
  role: string | undefined,
  userId: string,
  roleProfiles: RoleProfileMap,
  authState: IStateAuth
): AvatarInfo {
  const profile = role ? roleProfiles[role] : undefined;
  const displayName =
    profile?.fullname ||
    authState?.userInfo?.fullname ||
    (role ? roleLabel(role) : '');
  const seed =
    profile?.fhirId || authState?.userInfo?.fhirId || userId || role || '';
  const placeholder = generateAvatarPlaceholder({
    id: seed,
    name: displayName,
    email: profile?.email || authState?.userInfo?.email
  });
  return {
    seed: placeholder.seed,
    initials: placeholder.initials,
    backgroundColor: placeholder.backgroundColor,
    photoUrl:
      profile?.profile_picture || authState?.userInfo?.profile_picture || ''
  };
}

function avatarInfoForRole(role: string, profile?: RoleProfile): AvatarInfo {
  const displayName = profile?.fullname || roleLabel(role);
  const seed = profile?.fhirId || role;
  const placeholder = generateAvatarPlaceholder({
    id: seed,
    name: displayName,
    email: profile?.email || ''
  });
  return {
    seed: placeholder.seed,
    initials: placeholder.initials,
    backgroundColor: placeholder.backgroundColor,
    photoUrl: profile?.profile_picture || ''
  };
}

function useRoleProfiles(
  userId: string,
  otherRoles: string[],
  currentRole: string | undefined
): [RoleProfileMap, (isOpen: boolean) => void] {
  const [roleProfiles, setRoleProfiles] = useState<RoleProfileMap>({});
  const fetchedRef = useRef(false);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && !fetchedRef.current && userId && otherRoles.length > 0) {
        fetchedRef.current = true;
        fetchRoleProfiles(userId, [...otherRoles, currentRole!]).then(
          setRoleProfiles
        );
      }
    },
    [userId, otherRoles, currentRole]
  );

  return [roleProfiles, handleOpenChange];
}

export default function RoleAvatarPopup({
  indicator,
  displayName
}: {
  indicator?: string;
  displayName?: string;
}) {
  const { state: authState } = useAuth();
  const roles = authState.userInfo?.roles ?? [];
  const currentRole = authState.userInfo?.role_name;
  const userId = authState.userInfo?.userId ?? '';
  const [roleProfiles, handleOpenChange] = useRoleProfiles(
    userId,
    roles.filter(r => r !== currentRole),
    currentRole
  );
  const currentAvatar = getCurrentAvatar(
    currentRole,
    userId,
    roleProfiles,
    authState
  );

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
      otherRoleAvatars={roles
        .filter(r => r !== currentRole)
        .map(role => ({
          role,
          ...avatarInfoForRole(role, roleProfiles[role])
        }))}
      currentAvatar={currentAvatar}
      roles={roles}
      indicator={indicator}
      displayName={displayName}
      onOpenChange={handleOpenChange}
    />
  );
}
