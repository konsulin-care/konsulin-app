'use client';

import { useCircleStats } from '@/services/api/circle';
import {
  communityMilestoneFor,
  nextMilestoneTarget
} from '@/utils/circle-stats';

export interface CirclePanelProps {
  isPatient: boolean;
  fhirId?: string;
}

/**
 * Community-track "Your circle" panel for the research hub.
 *
 * Patients see how many people completed the research through their link,
 * plus the community milestone reached (Buddy / Community Researcher /
 * Captain). Guests get upsell copy instead of any credit.
 *
 * @param isPatient - Whether the current user is a patient.
 * @param fhirId - Patient FHIR id used to query the referral Communications.
 */
export default function CirclePanel({ isPatient, fhirId }: CirclePanelProps) {
  const { data } = useCircleStats(isPatient ? fhirId : undefined);

  if (!isPatient) {
    return (
      <section
        data-testid='circle-upsell'
        className='card mt-2 flex flex-col gap-2 border-0 bg-white p-4'
      >
        <h2 className='text-sm font-bold text-gray-700'>Your circle</h2>
        <p className='text-xs text-gray-500'>
          Join the research and invite friends. You stay part of the community
          and can track referral milestones once you participate.
        </p>
      </section>
    );
  }

  const converted = data?.converted ?? 0;
  const milestone = communityMilestoneFor(converted);
  const next = nextMilestoneTarget(converted);

  return (
    <section
      data-testid='circle-panel'
      className='card mt-2 flex flex-col gap-2 border-0 bg-white p-4'
    >
      <h2 className='text-sm font-bold text-gray-700'>Your circle</h2>
      <p data-testid='circle-count' className='text-xs text-gray-500'>
        {converted} people completed the research through your link
      </p>
      {milestone && (
        <p
          data-testid='circle-milestone'
          className='text-[10px] font-bold text-[#13c2c2]'
        >
          Community milestone: {milestone}
        </p>
      )}
      <p className='text-[10px] text-gray-400'>
        {next === null
          ? 'Highest milestone reached. Thank you for growing the community!'
          : `${next - converted} more to the next milestone`}
      </p>
    </section>
  );
}
