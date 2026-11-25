'use client';

import { resolveMode, useFab } from '@/context/fabContext';
import { Plus } from 'lucide-react';
import { useCallback } from 'react';
import { ActionFab } from './fab/action-button';
import { FabCustomMenu } from './fab/custom-menu';
import { SelectionFab } from './fab/selection-button';
import { FabSpeedDial } from './fab/speed-dial';
import { FabToggleShell } from './fab/toggle-shell';
import type { MenuAction, Pill } from './fab/types';
import { usePillActions } from './fab/use-pill-actions';
import { useScrollHide } from './fab/use-scroll-hide';

/**
 * Global floating action button with four modes:
 * selection (delete), action (save), menu (custom), idle (speed-dial).
 */
export default function QuickActionFab() {
  const { state, dispatch } = useFab();
  const { pills, onPillClick, drawers } = usePillActions();

  const mode = resolveMode(state);
  const isVisible = useScrollHide(mode.type !== 'idle');

  const close = useCallback(
    () => dispatch({ type: 'CLOSE_PANEL' }),
    [dispatch]
  );
  const toggle = useCallback(
    () => dispatch({ type: 'TOGGLE_PANEL' }),
    [dispatch]
  );

  const handlePillClick = useCallback(
    (pill: Pill) => {
      close();
      onPillClick(pill);
    },
    [close, onPillClick]
  );

  const handleCustomAction = useCallback(
    (action: MenuAction) => {
      close();
      // skipcq: JS-0098 - fire-and-forget action with handled rejection
      void Promise.resolve(action.onAction()).catch(() => {
        /* handled */
      });
    },
    [close]
  );

  const fabVisibility = isVisible
    ? 'translate-y-0 opacity-100'
    : 'pointer-events-none translate-y-[100px] opacity-0';

  switch (mode.type) {
    case 'selection': {
      return (
        <div
          className={`fixed right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 transition-all duration-300 ${fabVisibility}`}
        >
          <SelectionFab config={mode.config} />
        </div>
      );
    }

    case 'action': {
      return (
        <div
          className={`fixed right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 transition-all duration-300 ${fabVisibility}`}
        >
          <ActionFab config={mode.config} />
        </div>
      );
    }

    case 'menu': {
      return (
        <>
          <FabToggleShell
            isOpen={state.panelOpen}
            onClose={close}
            onToggle={toggle}
            icon={mode.config.icon}
            visibilityClass={fabVisibility}
          >
            {state.panelOpen && (
              <FabCustomMenu
                actions={mode.config.actions}
                onAction={handleCustomAction}
              />
            )}
          </FabToggleShell>
          {drawers}
        </>
      );
    }

    case 'idle': {
      return (
        <>
          <FabToggleShell
            isOpen={state.panelOpen}
            onClose={close}
            onToggle={toggle}
            icon={Plus}
            visibilityClass={fabVisibility}
          >
            {state.panelOpen && (
              <FabSpeedDial pills={pills} onPillClick={handlePillClick} />
            )}
          </FabToggleShell>
          {drawers}
        </>
      );
    }

    default: {
      mode satisfies never;
    }
  }
}
