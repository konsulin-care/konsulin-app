import { FabProvider, useFab } from '@/context/fabContext';
import { fireEvent, render, screen } from '@testing-library/react';
import { Pencil, Share2 } from 'lucide-react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { MenuAction } from '../fab/types';
import SidebarPrimaryAction from '../sidebar-primary-action';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

interface HarnessProps {
  readonly mode:
    | { type: 'idle' }
    | {
        type: 'action';
        label: string;
        disabled?: boolean;
        isSaving?: boolean;
        onAction: () => void | Promise<void>;
      }
    | { type: 'selection'; count: number }
    | { type: 'menu'; actions: readonly MenuAction[] };
  readonly onDelete?: () => void;
  readonly onCancel?: () => void;
}

/** Dispatches a fixed FAB mode on mount and renders the primary action. */
function Harness({ mode, onDelete, onCancel }: HarnessProps) {
  const { dispatch } = useFab();

  useEffect(() => {
    if (mode.type === 'action') {
      dispatch({
        type: 'SET_ACTION',
        config: {
          label: mode.label,
          onAction: mode.onAction,
          disabled: mode.disabled,
          isSaving: mode.isSaving
        }
      });
    }
    if (mode.type === 'selection') {
      dispatch({
        type: 'SET_SELECTION',
        config: {
          count: mode.count,
          onDelete: onDelete ?? vi.fn(),
          onCancel: onCancel ?? vi.fn()
        }
      });
    }
    if (mode.type === 'menu') {
      dispatch({
        type: 'SET_MENU',
        config: { icon: Pencil, actions: mode.actions }
      });
    }
  }, [mode, onDelete, onCancel, dispatch]);

  return <SidebarPrimaryAction />;
}

/** Renders the primary action for the given FAB mode. */
function renderMode(props: HarnessProps) {
  return render(
    <FabProvider>
      <Harness {...props} />
    </FabProvider>
  );
}

describe('SidebarPrimaryAction', () => {
  it('renders the action label and calls onAction on click', () => {
    const onAction = vi.fn();
    renderMode({ mode: { type: 'action', label: 'Save Changes', onAction } });

    const button = screen.getByRole('button', { name: 'Save Changes' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button.className).toContain('bg-secondary');

    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not call onAction when the action config is disabled', () => {
    const onAction = vi.fn();
    renderMode({
      mode: {
        type: 'action',
        label: 'Save Changes',
        onAction,
        disabled: true
      }
    });

    const button = screen.getByRole('button', { name: 'Save Changes' });
    expect(button.className).toContain('bg-muted');

    fireEvent.click(button);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('does not call onAction while the action is saving', () => {
    const onAction = vi.fn();
    renderMode({
      mode: { type: 'action', label: 'Save Changes', onAction, isSaving: true }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onAction).not.toHaveBeenCalled();
  });

  it('swallows a rejected action promise', async () => {
    const onAction = vi.fn().mockRejectedValue(new Error('boom'));
    renderMode({ mode: { type: 'action', label: 'Save Changes', onAction } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await Promise.resolve();
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders the destructive delete count and the cancel button', () => {
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    renderMode({
      mode: { type: 'selection', count: 2 },
      onDelete,
      onCancel
    });

    const deleteButton = screen.getByRole('button', { name: 'Delete (2)' });
    expect(deleteButton.className).toContain('bg-destructive');
    expect(deleteButton.querySelector('.lucide-trash-2')).toBeTruthy();

    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders one button per menu action calling its onAction', () => {
    const edit = vi.fn();
    const share = vi.fn();
    renderMode({
      mode: {
        type: 'menu',
        actions: [
          { label: 'Edit', icon: Pencil, onAction: edit },
          { label: 'Share', icon: Share2, onAction: share }
        ]
      }
    });

    expect(screen.getAllByRole('button')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(edit).toHaveBeenCalledTimes(1);
    expect(share).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(share).toHaveBeenCalledTimes(1);
  });

  it('renders nothing in idle mode', () => {
    const { container } = renderMode({ mode: { type: 'idle' } });
    expect(container).toBeEmptyDOMElement();
  });
});
