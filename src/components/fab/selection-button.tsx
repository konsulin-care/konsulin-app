'use client';

import { useTranslations } from '@/i18n';
import { Trash2 } from 'lucide-react';
import type { SelectionConfig } from './types';

/** Red delete button shown in selection mode. */
export function SelectionFab({ config }: { readonly config: SelectionConfig }) {
  const t = useTranslations('page-header');
  return (
    <button
      type='button'
      onClick={config.onDelete}
      className='bg-destructive text-destructive-foreground flex h-14 items-center gap-2 rounded-full px-6 shadow-lg transition-all duration-300 hover:brightness-90'
    >
      <Trash2 className='h-5 w-5' />
      <span className='text-sm font-semibold whitespace-nowrap'>
        {t('delete_count', { count: config.count })}
      </span>
    </button>
  );
}
