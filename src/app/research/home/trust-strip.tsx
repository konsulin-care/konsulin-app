'use client';

import { useTranslations } from '@/i18n';

/** Where a participant who feels heavy can find help. */
const FAQ_HELP_URL = 'https://konsulin.care/faq/#bantuan';

/** Translation key suffix of every trust statement, in display order. */
const STATEMENT_KEYS = [
  'statement_1',
  'statement_2',
  'statement_3',
  'statement_4'
] as const;

/**
 * Participant home trust strip: what is true for every study on Konsulin,
 * followed by a link to the help section of the FAQ.
 *
 * @returns The trust strip element.
 */
export default function TrustStrip() {
  const t = useTranslations('research');

  return (
    <section
      data-testid='trust-strip'
      aria-label={t('trust_strip.heading')}
      className='border-border bg-card flex flex-col gap-3 rounded-lg border p-4'
    >
      <h2 className='text-foreground text-base font-bold'>
        {t('trust_strip.heading')}
      </h2>
      <ul className='flex flex-col gap-2'>
        {STATEMENT_KEYS.map(key => (
          <li
            key={key}
            className='text-charcoal-700 flex gap-2 text-sm leading-relaxed'
          >
            <span aria-hidden='true' className='text-primary'>
              &middot;
            </span>
            <span>{t(`trust_strip.${key}`)}</span>
          </li>
        ))}
      </ul>
      <a
        href={FAQ_HELP_URL}
        data-testid='trust-strip-help'
        className='text-primary inline-flex min-h-11 items-center rounded-lg text-sm font-semibold underline'
      >
        {t('trust_strip.help_link')}
      </a>
    </section>
  );
}
