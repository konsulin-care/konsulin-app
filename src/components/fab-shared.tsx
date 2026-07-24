'use client';

import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import type { ComponentType } from 'react';

export type Pill = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  delay: number;
  action: 'navigate' | 'register-practitioner' | 'add-location';
  href?: string;
};

export type CustomAction = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onAction: () => void;
};

/** A pill button for the speed-dial menu. */
export function PillButton({
  pill,
  onClick
}: {
  readonly pill: Pill;
  readonly onClick: (pill: Pill) => void;
}) {
  return (
    <button
      type='button'
      onClick={() => onClick(pill)}
      className='animate-pill-in inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium text-[#2c2f35] shadow-lg transition-colors hover:bg-gray-50'
      style={{ animationDelay: `${pill.delay}ms` }}
    >
      <pill.icon className='h-4 w-4' />
      {pill.label}
    </button>
  );
}

/** The toggle button on the FAB — morphs into icon+label in dirty mode. */
export function FabToggleButton({
  isOpen,
  isDirty,
  dirtyLabel,
  icon: Icon,
  onToggle
}: {
  readonly isOpen: boolean;
  readonly isDirty: boolean;
  readonly dirtyLabel: string | undefined;
  readonly icon?: ComponentType<{ className?: string }>;
  readonly onToggle: () => void;
}) {
  const ToggleIcon = Icon ?? Plus;
  return (
    <button
      type='button'
      onClick={onToggle}
      className={cn(
        'flex items-center justify-center rounded-full bg-[#13C2C2] text-white shadow-lg transition-all duration-300 hover:bg-[#0ea5a5]',
        isDirty ? 'h-14' : 'h-14 w-14',
        isOpen && !isDirty ? 'rotate-45' : ''
      )}
    >
      {isDirty ? (
        <div className='flex items-center gap-2 px-6 whitespace-nowrap'>
          {Icon && <Icon className='h-6 w-6 shrink-0' />}
          <span className='text-sm font-semibold'>
            {dirtyLabel ?? 'Save Changes'}
          </span>
        </div>
      ) : (
        <ToggleIcon className='h-6 w-6 transition-transform duration-300' />
      )}
    </button>
  );
}

/** Custom menu pills for detail view actions (Edit, Delete, Share). */
export function CustomMenuPills({
  actions,
  onAction
}: {
  readonly actions: readonly CustomAction[];
  readonly onAction: (action: CustomAction) => void;
}) {
  return (
    <div className='flex flex-col-reverse items-end gap-3'>
      {actions.map(action => (
        <button
          key={action.label}
          type='button'
          onClick={() => onAction(action)}
          className='animate-pill-in inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium text-[#2c2f35] shadow-lg transition-colors hover:bg-gray-50'
        >
          <action.icon className='h-4 w-4' />
          {action.label}
        </button>
      ))}
    </div>
  );
}

/** Red delete button shown in selection mode. */
export function DeleteFabButton({
  count,
  onDelete
}: {
  readonly count: number;
  readonly onDelete: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onDelete}
      className='flex h-14 items-center gap-2 rounded-full bg-red-500 px-6 text-white shadow-lg transition-all duration-300 hover:bg-red-600'
    >
      <Trash2 className='h-5 w-5' />
      <span className='text-sm font-semibold whitespace-nowrap'>
        Delete ({count})
      </span>
    </button>
  );
}
