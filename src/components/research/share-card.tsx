'use client';

import { useShareBooster } from '@/hooks/useShareBooster';
import {
  buildShareMessage,
  buildShareUrl,
  buildWhatsAppShareUrl
} from '@/utils/referral';
import { useEffect, useState } from 'react';

export interface ShareCardProps {
  isPatient: boolean;
  fhirId?: string;
}

/**
 * Share card for the research hub.
 *
 * Patients share a link carrying `?ref=p_<fhirId>` for attribution; guests
 * share a plain link. Offers one-tap WhatsApp sharing plus a clipboard
 * fallback, and counts shares toward the share-booster badges.
 *
 * @param isPatient - Whether the current user is a patient.
 * @param fhirId - Patient FHIR id used in the referral ref.
 */
export default function ShareCard({ isPatient, fhirId }: ShareCardProps) {
  const { count, badge, increment } = useShareBooster();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = buildShareUrl({ origin, isPatient, fhirId });
  const waUrl = buildWhatsAppShareUrl(buildShareMessage());

  const handleShare = async () => {
    increment();
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
      }
    } catch {
      // Share sheet dismissed or clipboard unavailable; intent already counted.
    }
  };

  return (
    <section
      data-testid='share-card'
      className='card mt-2 flex flex-col gap-2 border-0 bg-white p-4'
    >
      <h2 className='text-sm font-bold text-gray-700'>Invite a friend</h2>
      <p className='text-xs text-gray-500'>
        Share the research with your circle. Every completion helps the
        community and unlocks share badges (1/3/5).
      </p>
      <div className='flex gap-2'>
        <a
          href={waUrl}
          target='_blank'
          rel='noreferrer'
          data-testid='share-whatsapp'
          className='bg-secondary rounded-xl px-4 py-2 text-xs font-bold text-white'
        >
          WhatsApp
        </a>
        <button
          type='button'
          data-testid='share-copy'
          onClick={() => {
            void handleShare();
          }}
          className='border-secondary text-secondary rounded-xl border px-4 py-2 text-xs font-bold'
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
      {count > 0 && (
        <p data-testid='share-count' className='text-[10px] text-gray-400'>
          {count} share{count === 1 ? '' : 's'}
        </p>
      )}
      {badge && (
        <p
          data-testid='share-badge'
          className='text-[10px] font-bold text-[#13c2c2]'
        >
          Share badge unlocked: {badge}
        </p>
      )}
    </section>
  );
}
