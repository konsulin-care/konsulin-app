'use client';

import { Building } from 'lucide-react';

/** Org name badge shown in the clinic hero overlay. */
const OrgLabel = ({ name }: { name: string }) => (
  <span className='mt-1 inline-flex items-center gap-1 text-xs text-white/60'>
    <Building size={12} /> Managed by {name}
  </span>
);

/** Info column inside the clinic hero overlay (name, address, org label). */
function HeroInfo({
  clinicName,
  fullAddress,
  orgName
}: Readonly<{
  clinicName: string;
  fullAddress: string;
  orgName: string;
}>) {
  return (
    <div className='flex w-[60%] flex-col justify-center'>
      <div className='truncate text-lg font-bold text-white'>{clinicName}</div>
      <div className='mt-1 text-sm text-white/80'>{fullAddress}</div>
      <OrgLabel name={orgName} />
    </div>
  );
}

/** Hours column inside the clinic hero overlay. */
function HeroHours({
  hoursList
}: Readonly<{
  hoursList: string[];
}>) {
  return (
    <div className='flex w-[40%] flex-col justify-center gap-0.5'>
      {hoursList.map(h => (
        <div key={h} className='truncate text-xs text-white/80'>
          {h}
        </div>
      ))}
    </div>
  );
}

export { HeroHours, HeroInfo };
