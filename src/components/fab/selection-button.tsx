'use client';

import { Trash2 } from 'lucide-react';
import type { SelectionConfig } from './types';

/** Red delete button shown in selection mode. */
export function SelectionFab({ config }: { readonly config: SelectionConfig }) {
  return (
    <button
      type='button'
      onClick={config.onDelete}
      className='bg-destructive flex h-14 items-center gap-2 rounded-full px-6 text-white shadow-lg transition-all duration-300 hover:brightness-90'
    >
      <Trash2 className='h-5 w-5' />
      <span className='text-sm font-semibold whitespace-nowrap'>
        Delete ({config.count})
      </span>
    </button>
  );
}
