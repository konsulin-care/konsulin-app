'use client';

import { Badge } from '@/components/ui/badge';
import { generateAvatarSvgDataUrl } from '@/utils/gradientAvatar';
import { generateAvatarPlaceholder } from '@/utils/helper';
import Image from 'next/image';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';

interface PractitionerCardProps {
  readonly id: string;
  readonly practitionerName: string;
  readonly photoUrl: string | undefined;
  readonly specialties: string[];
  readonly healthcareServiceNames: string[];
  readonly practitionerRoleId: string;
  readonly href?: string;
}

const HIDDEN_PLACEHOLDER = '___hidden___';

/**
 * Practitioner card for the admin listing view.
 * Layout: square avatar (full card height) left, name/specialty/service right.
 * Overflown specialties are truncated with a (n+) indicator.
 */
export function PractitionerCard({
  id,
  practitionerName,
  photoUrl,
  specialties,
  healthcareServiceNames,
  practitionerRoleId,
  href
}: PractitionerCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [avatarSize, setAvatarSize] = useState(0);
  const [visibleSpecialties, setVisibleSpecialties] = useState<string[]>(
    specialties.length > 0 ? specialties : []
  );
  const [overflowCount, setOverflowCount] = useState(0);
  const [imgError, setImgError] = useState(false);

  const measureOverflow = useCallback(() => {
    const el = containerRef.current;
    if (!el || specialties.length === 0) return;

    // Temporarily render all items to measure full width
    // DOM element references for overflow measurement — not raw HTML.
    const childElements = [...el.children] as HTMLElement[];

    // Check which items are fully visible
    const containerWidth = el.clientWidth;
    let visibleCount = 0;
    let cumulativeWidth = 0;

    for (const child of childElements) {
      cumulativeWidth += child.scrollWidth;
      if (cumulativeWidth <= containerWidth) {
        visibleCount++;
      } else {
        break;
      }
    }

    const hidden = specialties.length - visibleCount;
    if (hidden > 0) {
      setVisibleSpecialties(specialties.slice(0, Math.max(1, visibleCount)));
      setOverflowCount(hidden);
    } else {
      // If all fit, reset to avoid stale state when container widens
      setVisibleSpecialties(specialties);
      setOverflowCount(0);
    }
  }, [specialties]);

  useEffect(() => {
    measureOverflow();
    const observer = new ResizeObserver(measureOverflow);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [measureOverflow]);

  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id,
    name: practitionerName
  });

  const gradientUrl = useMemo(() => {
    if (!seed || !initials) return null;
    return generateAvatarSvgDataUrl(seed, initials);
  }, [seed, initials]);

  const displayName =
    practitionerName && practitionerName.trim() !== '-'
      ? practitionerName
      : 'Practitioner';

  const serviceDisplay =
    healthcareServiceNames.length > 0
      ? healthcareServiceNames.join('; ')
      : 'No healthcare service registered';

  // Measure card height and set avatar width to match for a perfect square
  useLayoutEffect(() => {
    const el = cardRef.current;
    /** Read card height and set avatar width to match. */
    const updateSize = () => {
      setAvatarSize(el?.clientHeight ?? 0);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (el) observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const showPhoto = Boolean(photoUrl) && !imgError;

  const size = avatarSize || 80;

  let avatarContent: ReactNode;
  if (showPhoto) {
    avatarContent = (
      <Image
        src={photoUrl}
        alt={displayName}
        fill
        className='object-cover'
        unoptimized
        onError={() => {
          setImgError(true);
        }}
      />
    );
  } else if (gradientUrl) {
    avatarContent = (
      <Image
        src={gradientUrl}
        alt={displayName}
        fill
        className='object-cover'
        unoptimized
      />
    );
  } else {
    avatarContent = (
      <div
        className='flex h-full w-full items-center justify-center text-base font-bold text-white'
        style={{ backgroundColor: backgroundColor ?? '#13c2c2' }}
      >
        {initials}
      </div>
    );
  }

  return (
    <Link
      ref={cardRef}
      href={href ?? `/practitioner?id=${practitionerRoleId}`}
      className='card flex h-[100px] items-stretch overflow-hidden bg-[#F9F9F9] p-0'
    >
      {/* Square avatar spanning full card height */}
      <div
        className='relative shrink-0 overflow-hidden bg-[#13c2c2]'
        style={{ width: size, minWidth: size }}
      >
        {avatarContent}
      </div>

      {/* Practitioner details */}
      <div className='min-w-0 flex-1 p-4 pl-3'>
        <div className='text-[14px] font-bold text-black'>{displayName}</div>

        <div
          ref={containerRef}
          className='mt-1 flex flex-wrap items-center gap-1 overflow-hidden'
        >
          {visibleSpecialties.map(s => (
            <Badge
              key={s}
              className='shrink-0 bg-[#E1E1E1] px-2 py-[2px] text-[11px] font-normal text-black'
            >
              {s === HIDDEN_PLACEHOLDER ? '' : s}
            </Badge>
          ))}
          {overflowCount > 0 && (
            <span className='shrink-0 text-[11px] text-gray-500'>
              ({overflowCount}+)
            </span>
          )}
        </div>

        <div className='mt-1 truncate text-[12px] text-gray-500'>
          {serviceDisplay}
        </div>
      </div>
    </Link>
  );
}
