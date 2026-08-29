'use client';

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
  return (
    <button
      type='button'
      onClick={onToggle}
      disabled={disabled}
      aria-label={isOpen ? undefined : 'Open menu'}
      className={cn(
        'bg-secondary flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300',
        isOpen ? 'rotate-45' : '',
        disabled
          ? 'cursor-not-allowed bg-gray-300 text-gray-500 hover:bg-gray-300'
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
