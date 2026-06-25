'use client';

import Avatar from '@/components/general/avatar';
import { AvatarInfo } from '@/components/role-avatar-popup-types';

const BADGE_SIZE = 18;
const BADGE_CAP = 9;

/**
 * Renders the current role avatar with an optional "+N" badge
 * overlaying its bottom-right corner when additional roles exist.
 */
export function StackedCircles({
  currentAvatar,
  otherRoleAvatars
}: Readonly<{
  roles: string[];
  currentAvatar: AvatarInfo;
  otherRoleAvatars: (AvatarInfo & { role: string })[];
}>) {
  const badgeCount = otherRoleAvatars.length;
  const badgeLabel =
    badgeCount > BADGE_CAP ? `+${BADGE_CAP}` : `+${badgeCount}`;

  return (
    <div className='relative inline-flex'>
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
      {badgeCount > 0 && (
        <div
          className='absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full bg-[#2c2f35] text-[10px] leading-none font-bold text-white'
          style={{ width: BADGE_SIZE, height: BADGE_SIZE }}
        >
          {badgeLabel}
        </div>
      )}
    </div>
  );
}
