'use client';

import SectionHeader from '@/app/research/section-header';
import { useTranslations } from '@/i18n';

/** Kinds of section heading rendered by the participant home. */
export type HomeSectionKind =
  'up-next' | 'your-studies' | 'open-to-join' | 'learning';

/** Props of a participant home section heading. */
export interface HomeSectionHeadingProps {
  /** Which section the heading labels. */
  kind: HomeSectionKind;
  /** Number of joined studies, used by the your-studies heading. */
  count?: number;
}

/** Ordinal and message key of every section heading, in display order. */
const SECTIONS: Record<
  HomeSectionKind,
  { number: number; key: string; usesCount: boolean }
> = {
  'up-next': { number: 1, key: 'heading_up_next', usesCount: false },
  'your-studies': { number: 2, key: 'heading_your_studies', usesCount: true },
  'open-to-join': { number: 3, key: 'heading_open_to_join', usesCount: false },
  learning: { number: 4, key: 'heading_learning', usesCount: false }
};

/**
 * Participant home intro: the page's single h1 title plus the platform
 * sentence that explains how every study runs on Konsulin.
 *
 * @returns The intro header element.
 */
export default function HomeIntro() {
  const t = useTranslations('research');

  return (
    <header data-testid='home-intro' className='flex flex-col gap-3'>
      <h1
        data-testid='home-intro-title'
        className='text-foreground text-2xl leading-tight font-bold'
      >
        {t('home_intro.title')}
      </h1>
      <p className='text-charcoal-700 text-sm leading-relaxed'>
        {t('home_intro.platform')}
      </p>
    </header>
  );
}

/**
 * Labelled section heading of the participant home, using the shared
 * numbered section divider style.
 *
 * @param props - Section kind and, for your-studies, the joined count.
 * @returns The numbered section heading.
 */
export function HomeSectionHeading({
  kind,
  count
}: Readonly<HomeSectionHeadingProps>) {
  const t = useTranslations('research');
  const section = SECTIONS[kind];
  const label = section.usesCount
    ? t(`home_intro.${section.key}`, { count: count ?? 0 })
    : t(`home_intro.${section.key}`);

  return <SectionHeader number={section.number} label={label} />;
}
