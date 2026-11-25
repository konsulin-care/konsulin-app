'use client';

import { resolveMode, useFab } from '@/context/fabContext';
import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import type { ActionConfig, MenuAction, SelectionConfig } from './fab/types';

const ACTION_BUTTON_CLASS =
  'bg-secondary text-secondary-foreground border-turquoise-deep flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-semibold transition-colors md:flex-col md:text-[11px] lg:flex-row lg:text-sm';

const MENU_BUTTON_CLASS =
  'border-border bg-card text-foreground hover:bg-muted flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-2 py-2 text-sm font-medium transition-colors md:flex-col md:text-[11px] lg:flex-row lg:text-sm';

/**
 * Runs an action unless it is disabled or already saving and swallows
 * rejections so a failed save never surfaces as an unhandled promise.
 *
 * @param config - Action configuration from the FAB state
 */
function runGuarded(config: ActionConfig): void {
  if (config.disabled || config.isSaving) {
    return;
  }
  // skipcq: JS-0098 - fire-and-forget action with handled rejection
  void Promise.resolve(config.onAction()).catch(() => {
    /* handled */
  });
}

/** Action-mode tile rendered inside the sidebar primary-action slot. */
function SidebarAction({ config }: Readonly<{ config: ActionConfig }>) {
  const isDisabled = config.disabled === true;

  return (
    <button
      type='button'
      onClick={() => runGuarded(config)}
      disabled={isDisabled}
      className={cn(
        ACTION_BUTTON_CLASS,
        isDisabled && 'bg-muted text-charcoal-700 cursor-not-allowed'
      )}
    >
      {config.icon && <config.icon className='h-5 w-5 shrink-0' />}
      {config.label && (
        <span className='md:line-clamp-2 md:text-center'>{config.label}</span>
      )}
      {config.isSaving && (
        <span className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
      )}
    </button>
  );
}

/** Selection-mode tile: destructive delete plus a cancel escape hatch. */
function SidebarSelection({ config }: Readonly<{ config: SelectionConfig }>) {
  const t = useTranslations('page-header');

  return (
    <div className='flex w-full flex-col gap-2'>
      <button
        type='button'
        onClick={config.onDelete}
        className='bg-destructive text-destructive-foreground flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-transparent px-2 py-2 text-sm font-semibold transition-colors hover:brightness-90 md:flex-col md:text-[11px] lg:flex-row lg:text-sm'
      >
        <Trash2 className='h-5 w-5 shrink-0' />
        <span className='md:line-clamp-2 md:text-center'>
          {t('delete_count', { count: config.count })}
        </span>
      </button>
      <button
        type='button'
        onClick={config.onCancel}
        className={MENU_BUTTON_CLASS}
      >
        {t('cancel_selection')}
      </button>
    </div>
  );
}

/** Menu-mode tiles: one bordered button per configured action. */
function SidebarMenu({
  actions,
  onAction
}: Readonly<{
  actions: readonly MenuAction[];
  onAction: (action: MenuAction) => void;
}>) {
  return (
    <div className='flex w-full flex-col gap-2'>
      {actions.map(action => (
        <button
          key={action.label}
          type='button'
          onClick={() => onAction(action)}
          className={MENU_BUTTON_CLASS}
        >
          <action.icon className='h-5 w-5 shrink-0' />
          <span className='md:line-clamp-2 md:text-center'>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Primary action mirror of the floating action button, rendered as a tile
 * inside the tablet rail and desktop sidebar. Renders nothing when idle.
 *
 * @returns The action, selection or menu tile, or null when idle
 */
export default function SidebarPrimaryAction() {
  const { state } = useFab();
  const mode = resolveMode(state);

  switch (mode.type) {
    case 'action': {
      return <SidebarAction config={mode.config} />;
    }
    case 'selection': {
      return <SidebarSelection config={mode.config} />;
    }
    case 'menu': {
      return (
        <SidebarMenu
          actions={mode.config.actions}
          onAction={action => {
            // skipcq: JS-0098 - fire-and-forget action with handled rejection
            void Promise.resolve(action.onAction()).catch(() => {
              /* handled */
            });
          }}
        />
      );
    }
    case 'idle': {
      return null;
    }
    default: {
      mode satisfies never;
      return null;
    }
  }
}
