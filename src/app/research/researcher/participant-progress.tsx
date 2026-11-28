'use client';

import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';

/** Props of the participant progress block. */
export interface ParticipantProgressProps {
  /** Number of participants who joined the study. */
  count: number;
  /** Participant target; missing or 0 means no target was set. */
  target?: number | null;
  /** Shows a skeleton instead of the count while the count loads. */
  isLoading?: boolean;
}

const TEXT_CLASS = 'text-charcoal-700 text-sm';

/**
 * Shows how many participants joined a study against its target.
 *
 * With a target it renders the count line plus a capped progress bar; without
 * one it renders the count alone, so a missing target never reads as
 * "1 of 0 participants".
 *
 * @param props - Count, target and loading flag.
 * @returns The progress block, or a skeleton while loading.
 */
export default function ParticipantProgress({
  count,
  target,
  isLoading = false
}: Readonly<ParticipantProgressProps>) {
  const t = useTranslations('research');

  if (isLoading) {
    return (
      <Skeleton
        data-testid='participant-progress-skeleton'
        className='h-4 w-32'
      />
    );
  }

  const safeTarget = target ?? 0;

  if (safeTarget <= 0) {
    return (
      <p data-testid='participant-progress-count' className={TEXT_CLASS}>
        {t('researcher_card.count_no_target', { count })}
      </p>
    );
  }

  const percent = Math.min(100, Math.round((count / safeTarget) * 100));

  return (
    <div data-testid='participant-progress' className='flex flex-col gap-2'>
      <p className={TEXT_CLASS}>
        {t('researcher_card.count', { count, target: safeTarget })}
      </p>
      <Progress
        aria-label={t('goal.bar_label')}
        value={percent / 100}
        className='h-2'
      />
    </div>
  );
}
