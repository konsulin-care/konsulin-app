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
import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { IStateAuth } from '@/context/auth/authTypes';
import { fetchCSRFToken } from '@/services/auth';
import {
  fetchRoleProfiles,
  RoleProfile,
  RoleProfileMap
} from '@/services/batch-profile';
import { generateAvatarPlaceholder } from '@/utils/helper';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

const ROLE_LABELS: Record<string, string> = {
  [Roles.Patient]: 'Patient',
  [Roles.Practitioner]: 'Practitioner',
  [Roles.ClinicAdmin]: 'Clinic Admin'
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}

interface RoleAvatarPopupProps {
  indicator?: string;
  displayName?: string;
}

export default function RoleAvatarPopup({
  indicator,
  displayName
}: RoleAvatarPopupProps) {
  const router = useRouter();
  const { state: authState } = useAuth();
  const roles = authState.userInfo?.roles ?? [];
  const currentRole = authState.userInfo?.role_name;
  const otherRoles = roles.filter(r => r !== currentRole);
  const [open, setOpen] = useState(false);
  const [roleProfiles, setRoleProfiles] = useState<RoleProfileMap>({});
  const fetchedRef = useRef(false);

  const userId = authState.userInfo?.userId ?? '';

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen && !fetchedRef.current && userId && otherRoles.length > 0) {
        fetchedRef.current = true;
        fetchRoleProfiles(userId, [...otherRoles, currentRole!]).then(
          setRoleProfiles
        );
      }
    },
    [userId, otherRoles, currentRole]
  );

  const handleProfileClick = useCallback(() => {
    router.push('/profile');
  }, [router]);

  const handleRoleSwitch = useCallback(async (role: string) => {
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
      if (res.ok) {
        window.location.href = '/';
      }
    } catch {
      // role switch failed silently
    }
  }, []);

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

  const otherRoleAvatars = otherRoles.map(role => {
    const info = avatarInfoForRole(role, roleProfiles[role]);
    return { role, ...info };
  });

  return (
    <Dropdown open={open} onOpenChange={handleOpenChange}>
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
        {otherRoles.length > 0 && (
          <>
            <DropdownSeparator />
            {otherRoles.map(role => {
              const info = avatarInfoForRole(role, roleProfiles[role]);
              return (
                <DropdownItem
                  key={role}
                  className='cursor-pointer'
                  onClick={() => handleRoleSwitch(role)}
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
                    {roleLabel(role)}
                  </span>
                </DropdownItem>
              );
            })}
          </>
        )}
      </DropdownContent>
    </Dropdown>
  );
}

interface AvatarInfo {
  seed: string;
  initials: string;
  backgroundColor: string;
  photoUrl: string;
}

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

function HeaderText({
  indicator,
  displayName
}: {
  indicator?: string;
  displayName?: string;
}) {
  return (
    <div className='flex flex-col text-right'>
      {indicator && (
        <div className='text-xs font-normal text-[#2c2f35]'>{indicator}</div>
      )}
      {displayName && (
        <div className='text-sm font-bold text-[#2c2f35]'>{displayName}</div>
      )}
    </div>
  );
}

function StackedCircles({
  roles,
  currentAvatar,
  otherRoleAvatars
}: {
  roles: string[];
  currentAvatar: AvatarInfo;
  otherRoleAvatars: (AvatarInfo & { role: string })[];
}) {
  const total = roles.length;
  const baseSize = 32;
  const overlap = 8;
  const containerWidth = baseSize + (total - 1) * overlap;
  const OPACITIES = [0.8, 0.6, 0.5, 0.45];

  return (
    <div
      className='relative'
      style={{ width: containerWidth, height: baseSize }}
    >
      {otherRoleAvatars.map((item, index) => {
        const offsetX = (total - 1 - index) * overlap;
        const dist = otherRoleAvatars.length - 1 - index;
        const opacity = OPACITIES[Math.min(dist, OPACITIES.length - 1)];
        return (
          <div
            key={item.role}
            className='absolute'
            style={{
              left: offsetX,
              top: 0,
              zIndex: index + 1,
              opacity
            }}
          >
            <Avatar
              seed={item.seed}
              initials={item.initials}
              backgroundColor={item.backgroundColor}
              photoUrl={item.photoUrl}
              height={baseSize}
              width={baseSize}
              className='border-2 border-white text-xs'
              imageClassName='self-center'
            />
          </div>
        );
      })}
      <div className='absolute' style={{ left: 0, top: 0, zIndex: total }}>
        <Avatar
          seed={currentAvatar.seed}
          initials={currentAvatar.initials}
          backgroundColor={currentAvatar.backgroundColor}
          photoUrl={currentAvatar.photoUrl}
          height={baseSize}
          width={baseSize}
          className='border-2 border-white text-xs'
          imageClassName='self-center'
        />
      </div>
    </div>
  );
}
