'use client';

import { resolveMode, useFab } from '@/context/fabContext';
import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import type { ActionConfig, MenuAction, SelectionConfig } from './fab/types';
import { Button } from './ui/button';

const BAR_CLASS =
  'hidden md:flex sticky bottom-0 z-20 mt-auto justify-end gap-2 border-t border-border bg-background/80 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-150';

const OUTLINE_BUTTON_CLASS =
  'border-border bg-card text-foreground hover:bg-muted flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors';

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

/** Primary action button with icon, label and optional saving spinner. */
function ActionButton({ config }: Readonly<{ config: ActionConfig }>) {
  const isDisabled = config.disabled === true;
  const isSaving = config.isSaving === true;
  const label = config.barLabel ?? config.label;

  return (
    <Button
      type='button'
      variant='action'
      onClick={() => runGuarded(config)}
      disabled={isDisabled || isSaving}
      className={cn(
        isDisabled && 'bg-muted text-charcoal-700 cursor-not-allowed'
      )}
    >
      {config.icon && <config.icon className='h-5 w-5 shrink-0' />}
      {label && <span>{label}</span>}
      {config.isSaving && (
        <span
          data-testid='content-action-spinner'
          aria-hidden='true'
          className='h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent'
        />
      )}
    </Button>
  );
}

/** Selection-mode buttons: cancel escape hatch then destructive delete. */
function SelectionButtons({ config }: Readonly<{ config: SelectionConfig }>) {
  const t = useTranslations('page-header');

  return (
    <>
      <button
        type='button'
        onClick={config.onCancel}
        className={OUTLINE_BUTTON_CLASS}
      >
        {t('cancel_selection')}
      </button>
      <button
        type='button'
        onClick={config.onDelete}
        className='bg-destructive text-destructive-foreground flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-semibold transition-colors hover:brightness-90'
      >
        <Trash2 className='h-5 w-5 shrink-0' />
        <span>{t('delete_count', { count: config.count })}</span>
      </button>
    </>
  );
}

/** Menu-mode buttons: one outline button per configured action. */
function MenuButtons({
  actions,
  onAction
}: Readonly<{
  actions: readonly MenuAction[];
  onAction: (action: MenuAction) => void;
}>) {
  return (
    <>
      {actions.map(action => (
        <button
          key={action.label}
          type='button'
          onClick={() => onAction(action)}
          className={OUTLINE_BUTTON_CLASS}
        >
          <action.icon className='h-5 w-5 shrink-0' />
          <span>{action.label}</span>
        </button>
      ))}
    </>
  );
}

/**
 * Sticky bottom action bar mirroring the floating action button inside the
 * main content area from the md breakpoint. Renders nothing when idle.
 *
 * @returns The action bar region, or null when the FAB state is idle
 */
export default function ContentActionBar() {
  const { state } = useFab();
  const mode = resolveMode(state);
  const t = useTranslations('page-header');

  if (mode.type === 'idle') {
    return null;
  }

  return (
    <div
      role='region'
      aria-label={t('page_actions')}
      data-slot='content-action-bar'
      className={BAR_CLASS}
    >
      {mode.type === 'action' && <ActionButton config={mode.config} />}
      {mode.type === 'selection' && <SelectionButtons config={mode.config} />}
      {mode.type === 'menu' && (
        <MenuButtons
          actions={mode.config.actions}
          onAction={action => {
            // skipcq: JS-0098 - fire-and-forget action with handled rejection
            void Promise.resolve(action.onAction()).catch(() => {
              /* handled */
            });
          }}
        />
      )}
    </div>
  );
}
