'use client';

import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import { useResearchProgress } from '@/services/api/research';
import { formatBatchDate } from '@/utils/format-batch-date';
import { FlaskConical } from 'lucide-react';
import Link from 'next/link';

/**
 * Header widget showing the user's research participation: the primary
 * study title, current batch indicator, closing deadline, and progress.
 *
 * The whole card links to the research page. Renders nothing while loading,
 * when no active study exists, or when the user has no current batch.
 * Consumers (PageHeader) gate it to patients and guests only.
 */
export default function ResearchHeaderWidget() {
  const t = useTranslations('research');
  const locale = useLocale();
  const { data: progress, isLoading } = useResearchProgress();

  if (isLoading || !progress || progress.studies.length === 0) return null;

  const primary = progress.studies[0];
  const batch = primary.currentBatch;
  if (!batch) return null;

  const batchIndex = primary.batches.indexOf(batch) + 1;
  const batchTotal = primary.batches.length;
  const percent =
    primary.totalCount === 0
      ? 0
      : (primary.completedCount / primary.totalCount) * 100;

  return (
    <Link
      href='/research'
      data-testid='research-header-widget'
      className='card bg-muted flex h-full flex-col gap-1.5 border-0 p-3'
    >
      <div className='flex items-center'>
        <FlaskConical className='text-foreground mr-[10px] h-5 w-5 shrink-0' />
        <span className='text-turquoise-deep truncate text-left text-sm font-bold'>
          {primary.study.title}
        </span>
      </div>
      <div className='text-muted-foreground flex items-center justify-between text-xs'>
        <span className='text-foreground font-bold'>
          {t('batch_line.current', {
            index: batchIndex,
            total: batchTotal,
            date: formatBatchDate(batch.end, locale)
          })}
        </span>
      </div>
      <div className='flex items-center gap-2'>
        <div className='bg-muted h-1 flex-1 overflow-hidden rounded-full'>
          <div
            className='bg-turquoise-deep h-full rounded-full'
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className='text-charcoal-700 text-xs font-bold'>
          {t('contribution.batch_count', {
            completed: primary.completedCount,
            total: primary.totalCount
          })}
        </span>
      </div>
      <p className='text-muted-foreground text-xs leading-4'>
        {t('widget_note')}
      </p>
    </Link>
  );
}
