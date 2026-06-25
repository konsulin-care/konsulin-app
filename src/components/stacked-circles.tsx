'use client';

import Avatar from '@/components/general/avatar';
import { AvatarInfo } from '@/components/role-avatar-popup-types';

/**
 * Renders the current role avatar with a second circle peeking
 * 3px to the right when additional roles exist — creating a subtle
 * depth cue that signals more options beneath.
 */
export function StackedCircles({
  currentAvatar,
  otherRoleAvatars
}: Readonly<{
  roles: string[];
  currentAvatar: AvatarInfo;
  otherRoleAvatars: (AvatarInfo & { role: string })[];
}>) {
  const hasMultipleRoles = otherRoleAvatars.length > 0;

  return (
    <div className='relative inline-flex'>
      {hasMultipleRoles && (
        <div
          data-testid='stack-bg-circle'
          className='absolute -z-10 rounded-full bg-gradient-to-br from-[#13c2c2] to-[#6b7280] opacity-80'
          style={{ width: 32, height: 32, left: 3, top: 0 }}
        />
      )}
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
    </div>
  );
}
