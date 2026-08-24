'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Recommendation } from '@/types/recommendation';
import { formatCurrencyValue } from '@/utils/fhir/fee';
import { generateAvatarSvgDataUrl } from '@/utils/gradientAvatar';
import Image from 'next/image';
import { useMemo } from 'react';
import RecommendationBooking from './recommendation-booking';

const NEXT_SLOT_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
});

/** Extracts initials from a name string, skipping the "dr." honorific. */
function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  const meaningful = parts.filter(p => !/^dr\.?$/i.test(p));
  if (meaningful.length >= 2) {
    return (meaningful[0][0] + meaningful.at(-1)[0]).toUpperCase();
  }
  if (meaningful.length === 1) {
    return meaningful[0].slice(0, 2).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Format an ISO instant for the next-slot line.
 *
 * @param iso - ISO 8601 instant or null
 * @returns Human-readable local date-time, or an empty string
 */
function formatNextSlot(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return NEXT_SLOT_FORMATTER.format(date);
}

/**
 * One recommendation card: practitioner, service, fee, next slot, and
 * distance badge, with a Book trigger opening the shared booking drawer.
 */
export default function RecommendationCard({
  recommendation
}: Readonly<{
  recommendation: Recommendation;
}>) {
  const { fee, currency, distanceKm, practitionerName } = recommendation;
  const avatar = useMemo(
    () =>
      generateAvatarSvgDataUrl(practitionerName, getInitials(practitionerName)),
    [practitionerName]
  );
  const nextSlot = formatNextSlot(recommendation.nextSlot?.start);

  return (
    <div className='border-input flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm'>
      <div className='flex items-center gap-3'>
        {avatar && (
          <Image
            src={avatar}
            alt={practitionerName}
            width={44}
            height={44}
            className='h-11 w-11 rounded-full'
            unoptimized
          />
        )}
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-semibold'>{practitionerName}</p>
          <p className='text-muted-foreground truncate text-xs'>
            {recommendation.healthcareServiceName}
          </p>
        </div>
        {distanceKm !== null && distanceKm !== undefined && (
          <Badge variant='secondary'>{distanceKm.toFixed(1)} km</Badge>
        )}
      </div>

      <div className='flex flex-wrap gap-1'>
        {recommendation.specialties.map(specialty => (
          <Badge key={specialty} variant='outline'>
            {specialty}
          </Badge>
        ))}
      </div>

      <div className='flex items-center justify-between text-sm'>
        <span className='font-semibold'>
          {formatCurrencyValue(fee, currency)}
        </span>
        <span className='text-muted-foreground text-xs'>
          {nextSlot ? `Slot berikutnya: ${nextSlot}` : 'Slot belum tersedia'}
        </span>
      </div>

      <RecommendationBooking recommendation={recommendation}>
        <Button className='w-full'>Book</Button>
      </RecommendationBooking>
    </div>
  );
}
