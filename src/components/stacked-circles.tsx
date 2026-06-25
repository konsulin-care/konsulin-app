'use client';

import Avatar from '@/components/general/avatar';
import { AvatarInfo } from '@/components/role-avatar-popup-types';

const BADGE_CAP = 9;

/**
 * Renders the current role avatar with an optional "+N" badge
 * placed beside the avatar when additional roles exist.
 * The badge uses teal at 80% opacity to complement the opaque avatar.
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
    <div className='inline-flex items-center gap-1.5'>
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
        <div className='flex h-5 items-center rounded-full bg-[#13c2c2]/80 px-1.5 text-[11px] leading-none font-bold text-white'>
          {badgeLabel}
        </div>
      )}
    </div>
  );
}
