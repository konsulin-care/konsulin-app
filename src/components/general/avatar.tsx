import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useState } from 'react';

type Props = {
  photoUrl?: string;
  height?: number;
  width?: number;
  initials: string;
  backgroundColor: string;
  className?: string;
  imageClassName?: string;
  isRadiusIcon?: boolean;
};

export default function Avatar({
  photoUrl,
  initials,
  backgroundColor,
  height = 100,
  width = 100,
  className = '',
  imageClassName = '',
  isRadiusIcon = true
}: Props) {
  const [fallback, setFallback] = useState(false);

  return (
    <>
      {photoUrl && !fallback ? (
        <Image
          className={cn(
            isRadiusIcon
              ? `h-[${height}px] w-[${width}px] rounded-full object-cover`
              : '',
            imageClassName
          )}
          src={photoUrl}
          alt='practitioner'
          width={width}
          height={height}
          unoptimized
          onError={() => setFallback(true)}
        />
      ) : (
        <div
          className={cn(
            `flex h-[${height}px] w-[${width}px] items-center justify-center rounded-full font-bold text-white`,
            className
          )}
          style={{ backgroundColor }}
        >
          {initials}
        </div>
      )}
    </>
  );
}
