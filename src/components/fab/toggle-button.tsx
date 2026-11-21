'use client';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import type { ComponentType } from 'react';

interface FabToggleButtonProps {
  readonly isOpen: boolean;
  readonly icon?: ComponentType<{ className?: string }>;
  readonly onToggle: () => void;
  readonly disabled?: boolean;
}

/**
 * The toggle button on the FAB — shows a plus icon by default
 * or a custom icon. Rotates 45° when panel is open.
 */
export function FabToggleButton({
  isOpen,
  icon: Icon,
  onToggle,
  disabled
}: FabToggleButtonProps) {
  const t = useTranslations('page-header');

  return (
    <button
      type='button'
      onClick={onToggle}
      disabled={disabled}
      aria-label={isOpen ? t('close_menu') : t('open_menu')}
      aria-expanded={isOpen}
      className={cn(
        'bg-secondary text-secondary-foreground border-turquoise-deep flex h-14 w-14 items-center justify-center rounded-full border shadow-lg transition-all duration-300',
        isOpen ? 'rotate-45' : '',
        disabled
          ? 'bg-muted text-charcoal-700 hover:bg-muted cursor-not-allowed'
          : 'hover:brightness-90'
      )}
    >
      {Icon ? (
        <Icon className='h-6 w-6' />
      ) : (
        <Plus className='h-6 w-6 transition-transform duration-300' />
      )}
    </button>
  );
}
