'use client';

import { useShareStudy } from '@/hooks/useShareStudy';
import { cn } from '@/lib/utils';
import { Share2 } from 'lucide-react';

export interface ShareResearchButtonProps {
  /** Research study title included in the shared text. */
  title: string;
  /** Whether the user shares an attributed ref link. */
  isPatient: boolean;
  /** Patient FHIR id used in the referral ref. */
  fhirId?: string;
  /** Study to deep-link in the shared research URL. */
  studyId?: string;
  /** Visible label; defaults to "Tap to share this survey". */
  label?: string;
  /** Extra classes for context-specific layout. */
  className?: string;
  /** Test id; defaults to "share-research-footer". */
  dataTestId?: string;
}

/**
 * Reusable research share footer.
 *
 * Renders a text button with a share icon that shares the study via the
 * native Web Share API, falling back to copying the full invite message to
 * the clipboard with a "Link copied!" confirmation. Clicking never bubbles,
 * so it is safe inside clickable cards.
 *
 * @param props - Study title, attribution, share target, and presentation.
 */
export default function ShareResearchButton({
  title,
  isPatient,
  fhirId,
  studyId,
  label = 'Tap to share this survey',
  className,
  dataTestId = 'share-research-footer'
}: ShareResearchButtonProps) {
  const { handleShare, copied } = useShareStudy({
    studyId: studyId ?? '',
    isPatient,
    fhirId,
    title
  });

  return (
    <button
      type='button'
      data-testid={dataTestId}
      onClick={e => {
        e.stopPropagation();
        void handleShare();
      }}
      className={cn(
        'flex cursor-pointer items-center justify-center gap-1.5 text-center',
        className
      )}
    >
      <Share2 className='h-3 w-3' />
      {copied ? 'Link copied!' : label}
    </button>
  );
}
