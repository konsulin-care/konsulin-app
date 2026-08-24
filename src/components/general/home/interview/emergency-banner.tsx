'use client';

import type { EmergencyResource } from '@/types/recommendation-interview';
import { Phone } from 'lucide-react';

interface EmergencyBannerProps {
  /** Emergency helplines to render as tap-to-call links. */
  resources: EmergencyResource[];
}

/** Builds a `tel:` URI, appending the extension after a comma pause. */
function buildTelHref(resource: EmergencyResource): string {
  return resource.extension
    ? `tel:${resource.phone},${resource.extension}`
    : `tel:${resource.phone}`;
}

/**
 * Non-blocking emergency nudge banner.
 *
 * Shows Indonesia crisis hotlines as single-tap deep links. It never blocks
 * the booking flow — it only nudges the user that immediate help exists.
 *
 * @param props.resources - Hotlines to surface
 */
export function EmergencyBanner({ resources }: Readonly<EmergencyBannerProps>) {
  if (resources.length === 0) return null;
  return (
    <output
      data-testid='emergency-banner'
      className='mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3'
    >
      <p className='text-[12px] font-semibold text-amber-800'>
        You can call this hotline if you need to — we won&apos;t stop you from
        booking.
      </p>
      <ul className='mt-2 flex flex-col gap-2'>
        {resources.map(resource => (
          <li key={`${resource.name}-${resource.phone}`}>
            <a
              href={buildTelHref(resource)}
              className='flex items-center gap-2 text-[13px] font-medium text-amber-900 underline'
            >
              <Phone className='h-3.5 w-3.5' aria-hidden='true' />
              <span>{resource.name}</span>
              <span className='text-amber-700 no-underline'>
                {resource.phone}
                {resource.extension ? ` ext. ${resource.extension}` : ''}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </output>
  );
}

export default EmergencyBanner;
