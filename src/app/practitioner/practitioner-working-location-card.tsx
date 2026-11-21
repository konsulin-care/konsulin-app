'use client';

import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type Props = {
  readonly locationName: string;
  readonly workingDays: string[];
  readonly healthcareServiceNames: string[];
  readonly practitionerRoleId: string;
};

/**
 * Card displaying a practitioner's working location summary.
 *
 * Shows location name, working days as badges, and healthcare
 * service names. Clicking navigates to the availability page
 * for the given PractitionerRole.
 */
export default function PractitionerWorkingLocationCard({
  locationName,
  workingDays,
  healthcareServiceNames,
  practitionerRoleId
}: Props) {
  return (
    <Link
      href={`/practitioner/availability?id=${practitionerRoleId}`}
      className='card bg-muted flex flex-col gap-3 rounded-lg p-4'
    >
      <div className='text-foreground text-[14px] font-bold'>
        {locationName}
      </div>

      <div className='flex flex-wrap gap-1'>
        {workingDays.map(day => (
          <Badge
            key={day}
            className='bg-muted text-charcoal-700 px-2 py-[2px] text-xs font-normal'
          >
            {day}
          </Badge>
        ))}
      </div>

      <div className='text-muted-foreground text-xs'>
        {healthcareServiceNames.length > 0
          ? healthcareServiceNames.join(', ')
          : 'No healthcare service registered'}
      </div>
    </Link>
  );
}
