'use client';

import SectionHeader from '@/app/research/section-header';
import { useTranslations } from '@/i18n';

/** Kinds of section heading rendered by the researcher home. */
export type ResearcherSectionKind = 'next-step' | 'your-studies' | 'given-back';

/** Props of a researcher home section heading. */
export interface ResearcherSectionHeadingProps {
  /** Which section the heading labels. */
  kind: ResearcherSectionKind;
  /** Number of researcher studies, used by the your-studies heading. */
  count?: number;
}

/** Ordinal, message key and count usage of every section heading. */
const SECTIONS: Record<
  ResearcherSectionKind,
  { number: number; key: string; usesCount: boolean }
> = {
  'next-step': { number: 1, key: 'heading_next_step', usesCount: false },
  'your-studies': { number: 2, key: 'heading_your_studies', usesCount: true },
  'given-back': { number: 3, key: 'heading_given_back', usesCount: false }
};

/**
 * Researcher home intro: the page's single h1 title plus the sentence that
 * explains what the page tracks for the researcher.
 *
 * @returns The intro header element.
 */
export default function ResearcherIntro() {
  const t = useTranslations('research');

  return (
    <header data-testid='researcher-intro' className='flex flex-col gap-3'>
      <h1
        data-testid='researcher-intro-title'
        className='text-foreground text-2xl leading-tight font-bold'
      >
        {t('researcher_intro.title')}
      </h1>
    </header>
  );
}

/**
 * Labelled section heading of the researcher home, using the shared numbered
 * section divider style.
 *
 * @param props - Section kind and, for your-studies, the study count.
 * @returns The numbered section heading.
 */
export function ResearcherSectionHeading({
  kind,
  count
}: Readonly<ResearcherSectionHeadingProps>) {
  const t = useTranslations('research');
  const section = SECTIONS[kind];
  const label = section.usesCount
    ? t(`researcher_intro.${section.key}`, { count: count ?? 0 })
    : t(`researcher_intro.${section.key}`);

  return <SectionHeader number={section.number} label={label} />;
}
