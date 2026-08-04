'use client';

import { useShareBooster } from '@/hooks/useShareBooster';
import {
  buildShareMessage,
  buildShareUrl,
  buildWhatsAppShareUrl
} from '@/utils/referral';
import { useEffect, useState } from 'react';

export interface ShareResearchCtaProps {
  isPatient: boolean;
  fhirId?: string;
}

/**
 * Compact share CTA for the research success drawer.
 *
 * Opens WhatsApp with the prefilled message and research link, with a
 * clipboard fallback. Counts shares toward the share-booster badges.
 *
 * @param isPatient - Whether the user shares an attributed ref link.
 * @param fhirId - Patient FHIR id used in the referral ref.
 */
export default function ShareResearchCta({
  isPatient,
  fhirId
}: ShareResearchCtaProps) {
  const { increment } = useShareBooster();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = buildShareUrl({ origin, isPatient, fhirId });
  const waUrl = buildWhatsAppShareUrl(`${buildShareMessage()} ${shareUrl}`);

  const handleCopy = async () => {
    increment();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // Clipboard unavailable; the share intent is still counted.
    }
  };

  return (
    <div className='flex flex-col gap-2' data-testid='share-research-cta'>
      <p className='text-xs text-gray-600'>Invite a friend to the research:</p>
      <div className='flex gap-2'>
        <a
          href={waUrl}
          target='_blank'
          rel='noreferrer'
          data-testid='cta-whatsapp'
          className='bg-secondary rounded-xl px-4 py-2 text-xs font-bold text-white'
        >
          WhatsApp
        </a>
        <button
          type='button'
          data-testid='cta-copy'
          onClick={() => {
            void handleCopy();
          }}
          className='border-secondary text-secondary rounded-xl border px-4 py-2 text-xs font-bold'
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
