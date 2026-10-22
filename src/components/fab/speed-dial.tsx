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
          className='animate-pill-in text-primary inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium shadow-lg transition-colors hover:bg-gray-50'
          style={{ animationDelay: `${pill.delay}ms` }}
        >
          <pill.icon className='h-4 w-4' />
          {t(pill.label)}
        </button>
      ))}
    </div>
  );
}
