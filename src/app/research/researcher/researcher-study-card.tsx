'use client';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';
import { useLocale } from '@/lib/locale';
import { useStudyParticipantCount } from '@/services/api/research-counts';
import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { getResearchTarget } from '@/utils/fhir/research-target';
import { formatBatchDate } from '@/utils/format-batch-date';
import type { ResearchStudy } from 'fhir/r4';
import Link from 'next/link';

/** Props of the researcher study card. */
export interface ResearcherStudyCardProps {
  /** Study with its batches and computed metadata. */
  study: ResearchStudyWithBatches;
  /** Called with the study resource when the researcher posts a finding. */
  onPostFinding?: (study: ResearchStudy) => void;
}

const LINK_CLASS =
  'inline-flex min-h-11 items-center rounded-lg text-sm font-medium underline';

/**
 * Renders the kind line: one-time study or the current batch position.
 *
 * @param props - Study with its batches.
 * @returns The kind label.
 */
function KindLine({ study }: Readonly<{ study: ResearchStudyWithBatches }>) {
  const t = useTranslations('research');
  const total = study.batches.length;
  if (total <= 1) return <span>{t('overview.kind_one_time')}</span>;
  const currentId = study.currentBatch?.id;
  const found = study.batches.findIndex(batch => batch.id === currentId);
  return (
    <span>
      {t('overview.kind_batch', {
        index: found === -1 ? total : found + 1,
        total
      })}
    </span>
  );
}

/**
 * Renders the participant count against the study target.
 *
 * @param props - Raw count, target and loading flag.
 * @returns The count line or a skeleton while loading.
 */
function ParticipantLine({
  count,
  target,
  isLoading
}: Readonly<{ count: number; target: number; isLoading: boolean }>) {
  const t = useTranslations('research');
  if (isLoading) {
    return <Skeleton className='h-4 w-32' />;
  }
  return (
    <p className='text-charcoal-700 text-sm'>
      {t('researcher_card.count', { count, target })}
    </p>
  );
}

/**
 * Researcher study card: group, kind, closing date, participant count against
 * target, the study link and actions to open, manage or post a finding.
 *
 * @param props - Study and optional post-finding callback.
 * @returns The researcher study card element.
 */
export default function ResearcherStudyCard({
  study,
  onPostFinding
}: Readonly<ResearcherStudyCardProps>) {
  const t = useTranslations('research');
  const locale = useLocale();
  const studyId = study.study.id ?? '';
  const studyPath = `/study?id=${studyId}`;
  const target = getResearchTarget(study.study) ?? 0;
  const { data: participantCount, isLoading } = useStudyParticipantCount(
    study.study.id
  );

  return (
    <section
      data-testid='researcher-study-card'
      className='border-border bg-card flex flex-col gap-3 rounded-lg border p-4'
    >
      <div className='flex flex-col gap-1'>
        <p className='text-muted-foreground text-xs'>
          {study.study.sponsor?.display ?? t('side_facts.run_by_fallback')}
        </p>
        <h3 className='text-foreground text-base font-bold'>
          {study.study.title ?? ''}
        </h3>
      </div>
      <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-xs'>
        <KindLine study={study} />
        {study.currentBatch ? (
          <span>
            {t('up_next.closes', {
              date: formatBatchDate(study.currentBatch.end, locale)
            })}
          </span>
        ) : null}
      </div>
      <ParticipantLine
        count={participantCount ?? 0}
        target={target}
        isLoading={isLoading}
      />
      <div className='flex flex-col gap-1'>
        <span className='text-muted-foreground text-xs'>
          {t('researcher_card.study_link')}
        </span>
        <code className='text-charcoal-700 text-sm'>{studyPath}</code>
      </div>
      <div className='flex flex-wrap items-center gap-3'>
        <Link href={studyPath} className={LINK_CLASS}>
          {t('researcher_card.see_study_page')}
        </Link>
        <Link
          href={`/research/edit?id=${studyId}&page=title`}
          className={LINK_CLASS}
        >
          {t('researcher_card.manage_study')}
        </Link>
        <Button
          type='button'
          variant='action'
          className='min-h-11 rounded-lg'
          onClick={() => onPostFinding?.(study.study)}
        >
          {t('researcher_card.post_finding')}
        </Button>
      </div>
    </section>
  );
}
