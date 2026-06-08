'use client';

import { Badge } from '@/components/ui/badge';
import { Recommendation } from '@/constants/recommendations';
import { generateAvatarSvgDataUrl } from '@/utils/gradientAvatar';
import Image from 'next/image';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

interface RecommendationCardProps {
  recommendation: Recommendation;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

function CardPhoto({
  photoUrl,
  gradientDataUrl,
  name
}: Readonly<{
  photoUrl: string;
  gradientDataUrl: string | null;
  name: string;
}>) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        fill
        className='object-cover'
        sizes='(max-width: 640px) 100vw, 400px'
      />
    );
  }
  if (gradientDataUrl) {
    return (
      <Image
        src={gradientDataUrl}
        alt={name}
        fill
        className='object-cover'
        sizes='(max-width: 640px) 100vw, 400px'
        unoptimized
      />
    );
  }
  return null;
}

function ExpandingOverlay({
  expanded,
  setExpanded,
  isTouchDevice,
  name,
  serviceName,
  specialties,
  formattedFee,
  description,
  isOverflowing,
  serviceRef
}: Readonly<{
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isTouchDevice: boolean;
  name: string;
  serviceName: string;
  specialties: string[];
  formattedFee: string;
  description: string;
  isOverflowing: boolean;
  serviceRef: React.RefObject<HTMLDivElement | null>;
}>) {
  return (
    <button
      type='button'
      className={`absolute right-0 bottom-0 left-0 z-10 overflow-hidden bg-black/50 text-left backdrop-blur-md transition-[height] duration-300 ${
        expanded ? 'h-full' : 'h-[20%] group-hover:h-full'
      }`}
      aria-label={isTouchDevice ? 'Toggle details' : undefined}
      onClick={e => {
        if (isTouchDevice) {
          e.stopPropagation();
          setExpanded(prev => !prev);
        }
      }}
    >
      <div
        className={`absolute inset-0 flex flex-col justify-center overflow-hidden px-3 transition-opacity duration-200 ${
          expanded ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
        }`}
      >
        <div className='truncate text-center text-sm leading-tight font-bold text-white'>
          {name} ({formattedFee})
        </div>
        <div className='mt-1 flex items-center justify-center overflow-hidden'>
          <div
            ref={serviceRef}
            className={`text-xs whitespace-nowrap text-white/80 ${
              isOverflowing ? 'animate-marquee flex w-fit' : 'truncate'
            }`}
          >
            {isOverflowing ? (
              <>
                <span>{serviceName}</span>
                <span>{serviceName}</span>
              </>
            ) : (
              serviceName
            )}
          </div>
        </div>
      </div>

      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-1 p-4 text-center transition-opacity delay-100 duration-200 ${
          expanded
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 group-hover:delay-100'
        }`}
      >
        <p className='text-base font-bold text-white'>{name}</p>
        <div className='flex flex-wrap justify-center gap-1'>
          {specialties.map(s => (
            <Badge
              key={s}
              className='rounded-full border-none bg-white/20 px-2 py-0.5 text-[10px] text-white'
            >
              {s}
            </Badge>
          ))}
        </div>
        <p className='text-xs text-white/80'>{serviceName}</p>
        {description && (
          <p className='max-w-[90%] text-[10px] leading-tight text-white/70'>
            {description}
          </p>
        )}
        <p className='text-base font-bold text-white'>{formattedFee}</p>
      </div>
    </button>
  );
}

function useMarqueeAnimation() {
  useEffect(() => {
    if (document.getElementById('marquee-style')) return;
    const style = document.createElement('style');
    style.id = 'marquee-style';
    style.textContent = `
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .animate-marquee {
        animation: marquee 10s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  const meaningful = parts.filter(p => !/^dr\.?$/i.test(p));
  if (meaningful.length >= 2) {
    return (
      meaningful[0][0] + meaningful[meaningful.length - 1][0]
    ).toUpperCase();
  }
  if (meaningful.length === 1) {
    return meaningful[0].slice(0, 2).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function RecommendationCard({
  recommendation,
  className,
  style,
  onClick
}: Readonly<RecommendationCardProps>) {
  const [expanded, setExpanded] = useState(false);
  const { photoUrl, name, serviceName, specialties, fee, id, description } =
    recommendation;

  const formattedFee = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(fee);

  const initials = getInitials(name);

  const gradientDataUrl = useMemo(
    () => generateAvatarSvgDataUrl(id || name, initials),
    [id, name, initials]
  );

  const serviceRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = serviceRef.current;
    if (el) {
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    }
  }, [serviceName]);

  const isTouchDevice =
    globalThis.matchMedia?.('(hover: none)')?.matches ?? false;

  useMarqueeAnimation();

  return (
    <div
      className={`group relative aspect-square w-full cursor-pointer overflow-hidden rounded-2xl shadow-lg ${className ?? ''}`}
      style={style}
    >
      <button
        type='button'
        className='h-full w-full text-left'
        onClick={onClick}
      >
        <CardPhoto
          photoUrl={photoUrl}
          gradientDataUrl={gradientDataUrl}
          name={name}
        />
      </button>

      <ExpandingOverlay
        expanded={expanded}
        setExpanded={setExpanded}
        isTouchDevice={isTouchDevice}
        name={name}
        serviceName={serviceName}
        specialties={specialties}
        formattedFee={formattedFee}
        description={description}
        isOverflowing={isOverflowing}
        serviceRef={serviceRef}
      />
    </div>
  );
}
