'use client';

import { parseReferralRef, readRefFromUrl } from '@/utils/referral';
import { useEffect, useState } from 'react';

/**
 * Landing consent note shown only when the user arrived with a friend's
 * referral ref. Explains that completing the batch credits the referrer and
 * that referral patterns are used to study the research community.
 *
 * Renders nothing when no patient ref is present.
 */
export default function ReferralNotice() {
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    setRef(readRefFromUrl(window.location.href));
  }, []);

  if (!parseReferralRef(ref)) return null;

  return (
    <section
      data-testid='referral-notice'
      className='mt-2 rounded-xl border border-[#13c2c2]/30 bg-[#13c2c2]/5 p-4'
    >
      <p className='text-xs text-gray-600'>
        A friend invited you to this research. Completing the batch gives them
        community credit. Referral patterns are used only to study the structure
        of the research community.
      </p>
    </section>
  );
}
