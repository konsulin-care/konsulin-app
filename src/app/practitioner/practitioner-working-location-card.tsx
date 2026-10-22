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
      className='card flex flex-col gap-3 rounded-lg bg-[#F9F9F9] p-4'
    >
      <div className='text-[14px] font-bold text-black'>{locationName}</div>

      <div className='flex flex-wrap gap-1'>
        {workingDays.map(day => (
          <Badge
            key={day}
            className='bg-[#E1E1E1] px-2 py-[2px] text-[11px] font-normal text-black'
          >
            {day}
          </Badge>
        ))}
      </div>

      <div className='text-[12px] text-gray-500'>
        {healthcareServiceNames.length > 0
          ? healthcareServiceNames.join(', ')
          : 'No healthcare service registered'}
      </div>
    </Link>
  );
}
