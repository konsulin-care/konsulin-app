'use client';

import { studyKind } from '@/app/study/study-facts';
import type { OverviewStatus } from '@/app/study/study-overview';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import type { StudyProgress } from '@/utils/fhir/research';
import { getNextBatch } from '@/utils/fhir/research-schedule';
import { readStudyProfile } from '@/utils/fhir/study-profile';
import { formatBatchDate } from '@/utils/format-batch-date';
import Link from 'next/link';

/** Props of the joined study card on the participant home. */
export interface JoinedStudyCardProps {
  /** Progress of a study the participant has joined. */
  progress: StudyProgress;
  /** Reference date, yyyy-mm-dd. */
  today: string;
  /** Overrides the status derived from the study and its progress. */
  status?: OverviewStatus;
  /** Configured Konsulin organization id, when known. */
  konsulinOrganizationId?: string;
  /** True while the underlying research data is loading. */
  isLoading?: boolean;
  /** True when the underlying research data failed to load. */
  isError?: boolean;
}

/**
 * Derives the chip status of a joined study.
 *
 * @param progress - Study progress.
 * @param today - Reference date, yyyy-mm-dd.
 * @returns The overview status for the chip.
 */
function statusOf(progress: StudyProgress, today: string): OverviewStatus {
  if (progress.study.status !== 'active') return 'closed';
  if (progress.currentBatch) {
    return progress.isComplete ? 'shared' : 'needs_you';
  }
  return getNextBatch(progress.batches, today) ? 'open' : 'closed';
}

/**
 * Builds the group and lead line of the card.
 *
 * @param progress - Study progress.
 * @param konsulinOrganizationId - Configured Konsulin organization id.
 * @param fallbackGroup - Group name when the study has no sponsor.
 * @param translate - Translator for the research namespace.
 * @returns The group and lead line.
 */
function groupLeadLine(
  progress: StudyProgress,
  konsulinOrganizationId: string,
  fallbackGroup: string,
  translate: (key: string, values?: Record<string, string | number>) => string
): string {
  const profile = readStudyProfile(progress.study, konsulinOrganizationId);
  const group = profile.groupName ?? fallbackGroup;
  if (!profile.leadName) return group;
  return translate('overview.kicker', { group, name: profile.leadName });
}

/**
 * Status chip of the joined study card.
 *
 * @param props - Status to label.
 * @returns The chip element.
 */
function StatusChip({ status }: Readonly<{ status: OverviewStatus }>) {
  const t = useTranslations('research');
  return (
    <span
      data-testid='joined-card-status'
      data-status={status}
      className='border-border inline-flex w-fit rounded-lg border px-2 py-1 text-xs font-medium'
    >
      {t(`overview.status_${status}`)}
    </span>
  );
}

/**
 * Batch line plus shared progress, or the next batch opening date.
 *
 * @param props - Study progress and reference date.
 * @returns The batch summary elements.
 */
function BatchSummary({
  progress,
  today
}: Readonly<{ progress: StudyProgress; today: string }>) {
  const t = useTranslations('research');
  const tc = useTranslations('common');
  const locale = useLocale();

  if (!progress.currentBatch) {
    const next = getNextBatch(progress.batches, today);
    if (!next) return null;
    return (
      <p data-testid='joined-card-batch' className='text-charcoal-700 text-sm'>
        {tc('report.next_batch_opens', {
          date: formatBatchDate(next.start, locale)
        })}
      </p>
    );
  }

  const kind = studyKind(progress);
  const kindLine =
    kind.kind === 'one-time'
      ? t('overview.kind_one_time')
      : t('overview.kind_batch', { index: kind.index, total: kind.total });

  return (
    <div className='flex flex-col gap-1'>
      <p data-testid='joined-card-batch' className='text-charcoal-700 text-sm'>
        {kindLine}
      </p>
      <p
        data-testid='joined-card-progress'
        className='text-muted-foreground text-xs'
      >
        {t('joined_card.progress', {
          done: progress.completedCount,
          total: progress.totalCount
        })}
      </p>
    </div>
  );
}

/**
 * Loading placeholder of the joined study card.
 *
 * @returns Skeleton blocks.
 */
function CardLoading() {
  const t = useTranslations('research');
  return (
    <output
      data-testid='joined-card-loading'
      aria-busy='true'
      aria-label={t('loading_label')}
      className='flex flex-col gap-2'
    >
      <Skeleton className='h-6 w-2/3 rounded-lg' />
      <Skeleton className='h-16 w-full rounded-lg' />
    </output>
  );
}

/**
 * Participant home card for one joined study: title, group and lead, status,
 * batch summary and the links into the study and the participant report.
 *
 * @param props - Study progress, reference date, status override and states.
 * @returns The card element.
 */
export default function JoinedStudyCard({
  progress,
  today,
  status,
  konsulinOrganizationId = '',
  isLoading = false,
  isError = false
}: Readonly<JoinedStudyCardProps>) {
  const t = useTranslations('research');
  const tCommon = useTranslations('common');

  if (isLoading) return <CardLoading />;
  if (isError) {
    return (
      <p role='alert' data-testid='joined-card-error' className='text-sm'>
        {tCommon('error.title')}
      </p>
    );
  }

  const studyId = progress.study.id ?? '';
  const chipStatus = status ?? statusOf(progress, today);
  const groupLead = groupLeadLine(
    progress,
    konsulinOrganizationId,
    t('side_facts.run_by_fallback'),
    t
  );
  const canSeeReport = Boolean(progress.currentBatch) && progress.isComplete;

  return (
    <article
      data-testid='joined-study-card'
      className='border-border bg-card flex flex-col gap-3 rounded-lg border p-4'
    >
      <p className='text-muted-foreground text-xs'>{groupLead}</p>
      <h3 className='text-foreground text-base font-bold'>
        {progress.study.title ?? ''}
      </h3>
      <StatusChip status={chipStatus} />
      <BatchSummary progress={progress} today={today} />
      <div className='flex flex-wrap items-center gap-3'>
        <Button variant='action' asChild className='min-h-11 rounded-lg'>
          <Link href={`/study?id=${studyId}`}>
            {t('joined_card.open_study')}
          </Link>
        </Button>
        {canSeeReport ? (
          <Link
            href={`/report?id=${studyId}`}
            className='inline-flex min-h-11 items-center rounded-lg text-sm font-medium underline'
          >
            {t('joined_card.see_report')}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
