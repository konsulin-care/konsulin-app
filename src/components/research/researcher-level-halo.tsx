'use client';

import Avatar from '@/components/general/avatar';
import { LEVEL_XP } from '@/constants/research';
import { useAuth } from '@/context/auth/authContext';
import { generateAvatarPlaceholder } from '@/utils/helper';
import { useMemo } from 'react';

/** Avatar data resolved from the current user profile. */
interface AvatarData {
  photoUrl?: string;
  initials: string;
  backgroundColor: string;
  seed: string;
}

/**
 * Halo ring around the profile picture for researchers: the ring arc is the
 * impact points earned within the current level, with a "Lv N" chip pinned
 * to the bottom edge. Uses teal color for the arc.
 *
 * @param impactInLevel - Progress within current level (0–99).
 * @param levelNumber - Current numeric level.
 */
export default function ResearcherLevelHalo({
  impactInLevel,
  levelNumber
}: Readonly<{ impactInLevel: number; levelNumber: number }>) {
  const { state: authState } = useAuth();

  const avatar: AvatarData = useMemo(() => {
    const placeholder = generateAvatarPlaceholder({
      name: authState?.userInfo?.fullname,
      email: authState?.userInfo?.email,
      userId: authState?.userInfo?.userId
    });
    return {
      photoUrl: authState?.userInfo?.profile_picture,
      initials: placeholder.initials ?? 'RS',
      backgroundColor: placeholder.backgroundColor ?? '#13c2c2',
      seed: placeholder.seed ?? 'researcher'
    };
  }, [authState?.userInfo]);

  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(1, Math.max(0, impactInLevel / LEVEL_XP));

  return (
    <div className='relative h-[72px] w-[72px] shrink-0'>
      <svg width='72' height='72' viewBox='0 0 72 72'>
        <circle
          cx='36'
          cy='36'
          r={radius}
          fill='none'
          stroke='#E5E7EB'
          strokeWidth='8'
        />
        <circle
          cx='36'
          cy='36'
          r={radius}
          fill='none'
          strokeWidth='8'
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          strokeLinecap='round'
          transform='rotate(-90 36 36)'
          data-testid='researcher-halo-ring'
          data-fraction={fraction}
          style={{ stroke: 'var(--color-secondary)' }}
        />
      </svg>
      <div className='absolute inset-[6px] overflow-hidden rounded-full'>
        <Avatar
          photoUrl={avatar.photoUrl}
          initials={avatar.initials}
          backgroundColor={avatar.backgroundColor}
          seed={avatar.seed}
          height={60}
          width={60}
        />
      </div>
      <span
        data-testid='researcher-level'
        className='bg-secondary absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-white'
      >
        Lv {levelNumber}
      </span>
    </div>
  );
}
