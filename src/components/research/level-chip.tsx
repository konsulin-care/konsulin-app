/** Visual style of a level chip. */
export type LevelChipVariant = 'level' | 'guest';

/** Props for {@link LevelChip}. */
export interface LevelChipProps {
  /** Text shown inside the chip. */
  label: string;
  /** Chip style: a levelled participant or a guest. */
  variant?: LevelChipVariant;
}

/** Props for {@link LevelProgressBar}. */
export interface LevelProgressBarProps {
  /** Progress fraction, clamped to the 0–1 range. */
  fraction: number;
  /** Accessible name for the progress bar. */
  label: string;
}

const CHIP_BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs';

const CHIP_VARIANTS: Record<LevelChipVariant, string> = {
  level: 'bg-accent ring-1 ring-turquoise-deep font-bold text-foreground',
  guest: 'bg-muted border border-input text-charcoal-700'
};

/**
 * Renders a small label chip for a participant level or a guest.
 *
 * @param props - Chip label and optional variant (defaults to `level`).
 * @returns A span carrying the `level-chip` test id and variant attribute.
 */
export function LevelChip({ label, variant = 'level' }: LevelChipProps) {
  return (
    <span
      data-testid='level-chip'
      data-variant={variant}
      className={`${CHIP_BASE} ${CHIP_VARIANTS[variant]}`}
    >
      {label}
    </span>
  );
}

/**
 * Renders a horizontal progress bar for level progress.
 *
 * Clamps the incoming fraction to 0–1 and exposes the rounded percentage as
 * the accessible progress value.
 *
 * @param props - Progress fraction and accessible label.
 * @returns A track element with a turquoise fill whose width is the percentage.
 */
export function LevelProgressBar({ fraction, label }: LevelProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const percent = Math.round(clamped * 100);

  return (
    <div
      data-testid='level-progress-bar'
      role='progressbar'
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className='bg-muted h-1.5 w-full overflow-hidden rounded-full'
    >
      <div
        data-testid='level-progress-fill'
        className='bg-turquoise-deep h-full rounded-full'
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
