'use client';

import { cn } from '@/lib/utils';
import type { ActionConfig } from './types';

const variantStyles: Record<string, string> = {
  primary:
    'bg-secondary text-secondary-foreground border-turquoise-deep border hover:brightness-90',
  danger: 'bg-destructive text-destructive-foreground hover:brightness-90',
  secondary: 'bg-card text-foreground border-border border hover:bg-muted',
  ghost: 'bg-transparent text-muted-foreground hover:bg-muted'
};

/** Action button shown in action mode. Renders as icon-only circle when label is absent, pill with label otherwise. */
export function ActionFab({ config }: { readonly config: ActionConfig }) {
  const variant = config.variant ?? 'primary';
  const hasLabel = Boolean(config.label);
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
        'flex items-center rounded-full shadow-lg transition-all duration-300',
        hasLabel ? 'h-14 gap-2 px-6' : 'h-14 w-14 justify-center',
        variantStyles[variant],
        config.disabled
          ? 'bg-muted text-charcoal-700 hover:bg-muted cursor-not-allowed'
          : ''
      )}
    >
      {config.icon && <config.icon className='h-6 w-6 shrink-0' />}
      {hasLabel && (
        <span className='text-sm font-semibold whitespace-nowrap'>
          {config.label}
        </span>
      )}
      {config.isSaving && (
        <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
      )}
    </button>
  );
}
