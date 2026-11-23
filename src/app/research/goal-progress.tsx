'use client';

import { useTranslations } from '@/i18n';

/** Tick positions rendered across the goal track, in percent. */
const TICK_POSITIONS = [25, 50, 75] as const;

/** Props for the collective goal progress bar. */
interface GoalProgressProps {
  count: number;
  target: number;
}

/**
 * Renders the collective participation progress towards a study target.
 *
 * The track shows the clamped completion percentage as a turquoise fill with
 * quarter/half/three-quarter tick marks, followed by the "{count} of {target}"
 * label.
 *
 * @param props - Current participant count and the study target.
 * @returns The progress bar with its label.
 */
export function GoalProgress({ count, target }: Readonly<GoalProgressProps>) {
  const t = useTranslations('research');
  const percent = Math.min(100, Math.round((count / target) * 100));

  return (
    <div className='flex w-full flex-col gap-1'>
      <div
        role='progressbar'
        aria-label={t('goal.bar_label')}
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className='bg-muted relative h-1.5 rounded-full'
      >
        <div
          className='bg-turquoise-deep h-full rounded-full'
          style={{ width: `${percent}%` }}
        />
        {TICK_POSITIONS.map(position => (
          <span
            key={position}
            data-testid='goal-tick'
            aria-hidden='true'
            className='bg-border absolute top-0 h-full w-px'
            style={{ left: `${position}%` }}
          />
        ))}
      </div>
      <span className='text-muted-foreground text-xs'>
        {t('goal.progress', { count, target })}
      </span>
    </div>
  );
}
