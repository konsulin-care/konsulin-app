'use client';

import FindingComposer from '@/app/research/researcher/finding-composer';
import GivenBackList from '@/app/research/researcher/given-back-list';
import { useTranslations } from '@/i18n';
import type { ResearchStudy } from 'fhir/r4';
import { useEffect, useRef } from 'react';

/** Props of the manage-page findings card. */
export interface FindingsCardProps {
  /** Study the researcher posts findings for. */
  study: ResearchStudy;
  /** Renders the composer submit button as the turquoise action variant. */
  primary?: boolean;
}

/** Hash that opens the page scrolled to this card. */
const FINDING_HASH = '#finding';

/**
 * Brings the card into view and focuses the finding textarea when the page was
 * opened with the #finding hash.
 *
 * @param section - The card element to scroll to.
 * @returns Nothing.
 */
function revealFindingForm(section: HTMLElement | null): void {
  if (window.location.hash !== FINDING_HASH) return;
  section?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  const textarea = document.querySelector<HTMLTextAreaElement>('#finding-text');
  textarea?.focus();
}

/**
 * Findings card of the manage page: the composer to post a new finding plus
 * the findings this study already gave back.
 *
 * @param props - Study and whether the composer button is the primary action.
 * @returns The findings card element.
 */
export default function FindingsCard({
  study,
  primary = false
}: Readonly<FindingsCardProps>) {
  const t = useTranslations('research');
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    revealFindingForm(sectionRef.current);
  }, []);

  return (
    <section
      ref={sectionRef}
      id='finding'
      data-testid='findings-card'
      className='border-border bg-card flex flex-col gap-4 rounded-lg border p-4'
    >
      <h2 className='text-foreground text-base font-bold'>
        {t('researcher_intro.heading_given_back')}
      </h2>
      <FindingComposer study={study} primary={primary} />
      <GivenBackList studies={[study]} />
    </section>
  );
}
