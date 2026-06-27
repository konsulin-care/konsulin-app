'use client';

import Avatar from '@/components/general/avatar';
import { Badge } from '@/components/ui/badge';
import { generateAvatarPlaceholder } from '@/utils/helper';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PractitionerCardProps {
  id: string;
  practitionerName: string;
  photoUrl: string | undefined;
  specialties: string[];
  healthcareServiceNames: string[];
  practitionerRoleId: string;
}

const HIDDEN_PLACEHOLDER = '___hidden___';

/**
 * Practitioner card for the admin listing view.
 * Layout: avatar left, name/specialty/service right.
 * Overflown specialties are truncated with a (n+) indicator.
 */
export function PractitionerCard({
  id,
  practitionerName,
  photoUrl,
  specialties,
  healthcareServiceNames,
  practitionerRoleId
}: PractitionerCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleSpecialties, setVisibleSpecialties] = useState<string[]>(
    specialties.length > 0 ? specialties : []
  );
  const [overflowCount, setOverflowCount] = useState(0);

  const measureOverflow = useCallback(() => {
    const el = containerRef.current;
    if (!el || specialties.length === 0) return;

    // Temporarily render all items to measure full width
    const children = [...el.children] as HTMLElement[];

    // Check which items are fully visible
    const containerWidth = el.clientWidth;
    let visibleCount = 0;
    let cumulativeWidth = 0;

    for (const child of children) {
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
    return () => observer.disconnect();
  }, [measureOverflow]);

  const { initials, backgroundColor, seed } = generateAvatarPlaceholder({
    id,
    name: practitionerName
  });

  const displayName =
    practitionerName && practitionerName.trim() !== '-'
      ? practitionerName
      : 'Practitioner';

  const serviceDisplay =
    healthcareServiceNames.length > 0
      ? healthcareServiceNames.join('; ')
      : 'No healthcare service registered';

  return (
    <Link
      href={`/practitioner?practitionerRoleId=${practitionerRoleId}`}
      className='card flex items-center border-0 bg-[#F9F9F9] p-4'
    >
      <Avatar
        seed={seed}
        initials={initials ?? ''}
        backgroundColor={backgroundColor ?? ''}
        photoUrl={photoUrl}
        height={48}
        width={48}
        className='mr-3 shrink-0 text-base'
        imageClassName='self-center'
      />

      <div className='min-w-0 flex-1'>
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
