'use client';

import Avatar from '@/components/general/avatar';
import { AvatarInfo } from '@/components/role-avatar-popup-types';

/** Computes layout parameters for stacked avatar circles. */
function computeLayerLayout(total: number) {
  return {
    total,
    baseSize: 32,
    overlap: 8,
    containerWidth: 32 + (total - 1) * 8,
    opacities: [0.8, 0.6, 0.5, 0.45] as const
  };
}

/** Renders a single avatar layer with given offset and opacity. */
function LayeredAvatar({
  avatar,
  baseSize,
  offsetX,
  opacity,
  zIndex
}: Readonly<{
  avatar: AvatarInfo;
  baseSize: number;
  offsetX: number;
  opacity: number;
  zIndex: number;
}>) {
  return (
    <div
      className='absolute'
      style={{ left: offsetX, top: 0, zIndex, opacity }}
    >
      <Avatar
        seed={avatar.seed}
        initials={avatar.initials}
        backgroundColor={avatar.backgroundColor}
        photoUrl={avatar.photoUrl}
        height={baseSize}
        width={baseSize}
        className='border-2 border-white text-xs'
        imageClassName='self-center'
      />
    </div>
  );
}

/**
 *
 */
export function StackedCircles({
  roles,
  currentAvatar,
  otherRoleAvatars
}: Readonly<{
  roles: string[];
  currentAvatar: AvatarInfo;
  otherRoleAvatars: (AvatarInfo & { role: string })[];
}>) {
  const layout = computeLayerLayout(roles.length);

  return (
    <div
      className='relative'
      style={{ width: layout.containerWidth, height: layout.baseSize }}
    >
      {otherRoleAvatars.map((item, index) => {
        const offsetX = (layout.total - 1 - index) * layout.overlap;
        const dist = otherRoleAvatars.length - 1 - index;
        const opacity =
          layout.opacities[Math.min(dist, layout.opacities.length - 1)];
        return (
          <LayeredAvatar
            key={item.role}
            avatar={item}
            baseSize={layout.baseSize}
            offsetX={offsetX}
            opacity={opacity}
            zIndex={index + 1}
          />
        );
      })}
      <LayeredAvatar
        avatar={currentAvatar}
        baseSize={layout.baseSize}
        offsetX={0}
        opacity={1}
        zIndex={layout.total}
      />
    </div>
  );
}
