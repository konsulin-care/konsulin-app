'use client';

import { GUEST_TITLE, RESEARCH_LEVELS } from '@/constants/research';
import { useTranslations } from '@/i18n';
import type { ResearchBatch } from '@/utils/fhir/research';

/** Props for the guest save card. */
export interface ReportSaveCardProps {
  /** XP earned by the batch just completed. */
  xp: number;
  /** The next batch, or null when the completed batch is the last one. */
  nextBatch: ResearchBatch | null;
}

/**
 * Guest-only card that explains why saving the report matters.
 *
 * The headline depends on whether another batch follows: a next batch invites
 * comparison, the last batch promises the study's findings. The free-of-charge
 * and 24-hour window lines keep the guest offer honest.
 *
 * @param props - XP of the completed batch and the next batch, if any.
 */
export function ReportSaveCard({
  xp,
  nextBatch
}: Readonly<ReportSaveCardProps>) {
  const t = useTranslations('common');
  const step = `${GUEST_TITLE.label} → ${RESEARCH_LEVELS[0].label}`;
  const headline = nextBatch
    ? t('report.save_headline_next')
    : t('report.save_headline_last');

  return (
    <section
      data-testid='report-save-card'
      className='border-border bg-card rounded-xl border p-4'
    >
      <div className='flex items-center justify-between gap-2'>
        <span
          data-testid='report-save-step'
          className='text-muted-foreground text-xs font-medium'
        >
          {step}
        </span>
        <span
          data-testid='report-save-xp'
          className='text-foreground text-sm font-bold'
        >
          {t('report.save_xp', { xp })}
        </span>
      </div>

      <p
        data-testid='report-save-headline'
        className='text-foreground mt-2 text-sm font-semibold'
      >
        {headline}
      </p>

      <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
        {t('report.save_free')}
      </p>
      <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
        {t('report.save_window')}
      </p>
    </section>
  );
}
