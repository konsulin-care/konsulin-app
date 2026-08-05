'use client';

import { buildShareUrl } from '@/utils/referral';
import { useCallback, useEffect, useState } from 'react';
import { useShareBooster } from './useShareBooster';

export interface UseShareStudyParams {
  studyId: string;
  isPatient: boolean;
  fhirId?: string;
}

/**
 * Study-scoped share handler for the research carousel.
 *
 * Builds `/research?id={studyId}` (plus `ref=p_{fhirId}` for patients),
 * counts the share toward the booster badges, and shares via the native Web
 * Share API with a clipboard fallback that flips a "Copied!" state.
 *
 * @param params - Study to deep-link and whether the user shares an attributed ref.
 * @returns The share URL, the copied flag, and the share handler.
 */
export function useShareStudy({
  studyId,
  isPatient,
  fhirId
}: UseShareStudyParams): {
  shareUrl: string;
  copied: boolean;
  handleShare: () => Promise<void>;
} {
  const { increment } = useShareBooster();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = buildShareUrl({ origin, isPatient, fhirId, studyId });

  const handleShare = useCallback(async () => {
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
  }, [increment, shareUrl]);

  return { shareUrl, copied, handleShare };
}
