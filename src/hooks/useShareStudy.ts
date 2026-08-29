'use client';

import { buildResearchShareMessage, buildShareUrl } from '@/utils/referral';
import { useCallback, useEffect, useState } from 'react';

export interface UseShareStudyParams {
  studyId: string;
  isPatient: boolean;
  fhirId?: string;
  /** Research study title interpolated into the shared text. */
  title?: string;
}

/**
 * Study-scoped share handler for the research carousel and completion drawer.
 *
 * Builds `/research?view={studyId}` (plus `ref=p_{fhirId}` for patients) and,
 * when a title is given, a full message
 * `Join me as a citizen scientist through {title} in Konsulin.\n{url}`. Shares
 * via the native Web Share API when it accepts the payload, with a clipboard
 * fallback that copies the full message and flips a "Copied!" state.
 *
 * @param params - Study to deep-link, attribution, and the study title.
 * @returns The share URL, the copied flag, and the share handler.
 */
export function useShareStudy({
  studyId,
  isPatient,
  fhirId,
  title
}: UseShareStudyParams): {
  shareUrl: string;
  copied: boolean;
  handleShare: () => Promise<void>;
} {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = buildShareUrl({ origin, isPatient, fhirId, studyId });
  const message = title
    ? `${buildResearchShareMessage(title)}${shareUrl}`
    : shareUrl;

  const handleShare = useCallback(async () => {
    try {
      const payload = { title, text: message, url: shareUrl };
      // Feature-detect via typeof: lib.dom types navigator.share/canShare as
      // non-optional, but older browsers lack them at runtime.
      if (
        typeof navigator.share === 'function' &&
        (typeof navigator.canShare !== 'function' ||
          navigator.canShare(payload))
      ) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(message);
        setCopied(true);
      }
    } catch {
      // Share sheet dismissed or clipboard unavailable.
    }
  }, [message, shareUrl, title]);

  return { shareUrl, copied, handleShare };
}
