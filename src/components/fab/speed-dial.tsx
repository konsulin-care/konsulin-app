'use client';

import { useTranslations } from '@/i18n';
import type { Pill } from './types';

/** Animated role-based speed-dial pill list. */
export function FabSpeedDial({
  pills,
  onPillClick
}: {
  readonly pills: readonly Pill[];
  readonly onPillClick: (pill: Pill) => void;
}) {
  const t = useTranslations('page-header');
  return (
    <div className='flex flex-col-reverse items-end gap-3'>
      {pills.map(pill => (
        <button
          key={pill.label}
          type='button'
          onClick={() => onPillClick(pill)}
          className='animate-pill-in border-border bg-card text-foreground hover:bg-muted inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium shadow-lg transition-colors'
          style={{ animationDelay: `${pill.delay}ms` }}
        >
          <pill.icon className='h-4 w-4' />
          {t(pill.label)}
        </button>
      ))}
    </div>
  );
}
