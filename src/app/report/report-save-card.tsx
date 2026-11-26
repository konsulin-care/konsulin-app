'use client';

import { Button } from '@/components/ui/button';
import { useClaimReport } from '@/hooks/useClaimReport';
import { useTranslations } from '@/i18n';
import type { ResearchBatch } from '@/utils/fhir/research';

/** Props for the guest save card. */
export interface ReportSaveCardProps {
  /** Study id used to build the post-claim report path. */
  studyId: string;
  /** The next batch, or null when the completed batch is the last one. */
  nextBatch: ResearchBatch | null;
}

/**
 * Guest-only card that explains why saving the report matters.
 *
 * The headline depends on whether another batch follows. The Save report
 * button runs the shared claim action.
 *
 * @param props - Study id and the next batch, if any.
 */
export function ReportSaveCard({
  studyId,
  nextBatch
}: Readonly<ReportSaveCardProps>) {
  const t = useTranslations('common');
  const handleClaim = useClaimReport({ path: `/report?id=${studyId}` });
  const headline = nextBatch
    ? t('report.save_headline_next')
    : t('report.save_headline_last');

  return (
    <section
      data-testid='report-save-card'
      className='border-border bg-card rounded-lg border p-4'
    >
      <p
        data-testid='report-save-headline'
        className='text-foreground text-sm font-semibold'
      >
        {headline}
      </p>

      <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
        {t('report.save_free')}
      </p>
      <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
        {t('report.save_window')}
      </p>

      <Button
        type='button'
        data-testid='report-save-button'
        className='mt-3 min-h-11 w-full'
        onClick={handleClaim}
      >
        {t('report.fab_claim')}
      </Button>
    </section>
  );
}
