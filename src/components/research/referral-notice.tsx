'use client';

import { useTranslations } from '@/i18n';
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
  const t = useTranslations('research');
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    setRef(readRefFromUrl(window.location.href));
  }, []);

  if (!parseReferralRef(ref)) return null;

  return (
    <section
      data-testid='referral-notice'
      className='border-turquoise-deep/30 bg-accent mt-2 rounded-xl border p-4'
    >
      <p className='text-charcoal-700 text-xs'>{t('referral_notice')}</p>
    </section>
  );
}
