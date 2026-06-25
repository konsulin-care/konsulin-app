'use client';

import { cn } from '@/lib/utils';
import { generateAvatarSvgDataUrl } from '@/utils/gradientAvatar';
import Image from 'next/image';
import { useMemo, useState } from 'react';

type Props = {
  photoUrl?: string;
  height?: number;
  width?: number;
  initials: string;
  backgroundColor: string;
  className?: string;
  imageClassName?: string;
  isRadiusIcon?: boolean;
  seed?: string;
};

/**
 *
 */
export default function Avatar({
  photoUrl,
  initials,
  height = 100,
  width = 100,
  className = '',
  imageClassName = '',
  isRadiusIcon = true,
  seed
}: Props) {
  const [fallback, setFallback] = useState(false);

  const generatedUrl = useMemo(() => {
    if (photoUrl || !seed) return null;
    return generateAvatarSvgDataUrl(seed, initials);
  }, [photoUrl, seed, initials]);

  const displayUrl = photoUrl || generatedUrl;

  return displayUrl && !fallback ? (
    <Image
      className={cn(
        isRadiusIcon ? 'rounded-full object-cover' : '',
        imageClassName
      )}
      src={displayUrl}
      alt='practitioner'
      width={width}
      height={height}
      style={{ height, width }}
      unoptimized
      onError={() => setFallback(true)}
    />
  ) : (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold text-white',
        className
      )}
      style={{ backgroundColor: '#13c2c2', height, width }}
    >
      {initials}
    </div>
  );
}
