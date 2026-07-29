'use client';

import type { MenuAction } from './types';

/** Animated pill list for custom actions (edit, delete, share). */
export function FabCustomMenu({
  actions,
  onAction
}: {
  readonly actions: readonly MenuAction[];
  readonly onAction: (action: MenuAction) => void;
}) {
  return (
    <div className='flex flex-col-reverse items-end gap-3'>
      {actions.map(action => (
        <button
          key={action.label}
          type='button'
          onClick={() => onAction(action)}
          className='animate-pill-in text-primary inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium shadow-lg transition-colors hover:bg-gray-50'
        >
          <action.icon className='h-4 w-4' />
          {action.label}
        </button>
      ))}
    </div>
  );
}
