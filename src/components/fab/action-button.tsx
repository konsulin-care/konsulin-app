'use client';

import { cn } from '@/lib/utils';
import type { ActionConfig } from './types';

const variantStyles: Record<string, string> = {
  primary: 'bg-secondary text-white hover:brightness-90',
  danger: 'bg-destructive text-white hover:brightness-90',
  secondary: 'bg-softGray text-primary hover:bg-secondary hover:text-white',
  ghost: 'bg-transparent text-muted hover:bg-softGray'
};

/** Labeled action button shown in action mode. */
export function ActionFab({ config }: { readonly config: ActionConfig }) {
  const variant = config.variant ?? 'primary';
  return (
    <button
      type='button'
      onClick={() => {
        if (!config.disabled && !config.isSaving)
          Promise.resolve(config.onAction()).catch(() => {
            /* handled */
          });
      }}
      disabled={config.disabled}
      className={cn(
        'flex h-14 items-center gap-2 rounded-full px-6 shadow-lg transition-all duration-300',
        variantStyles[variant],
        config.disabled
          ? 'cursor-not-allowed bg-gray-300 text-gray-500 hover:bg-gray-300'
          : ''
      )}
    >
      {config.icon && <config.icon className='h-6 w-6 shrink-0' />}
      <span className='text-sm font-semibold whitespace-nowrap'>
        {config.label}
      </span>
      {config.isSaving && (
        <span className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
      )}
    </button>
  );
}
