import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FabDirtyProvider, useFabDirty } from '../fabDirtyContext';

/** Helper to read context state via the hook. */
function ContextConsumer() {
  const { dirtyState, setDirtyState } = useFabDirty();
  return (
    <div>
      <span data-testid='is-dirty'>
        {String(dirtyState?.isDirty ?? 'null')}
      </span>
      <span data-testid='label'>{dirtyState?.label ?? 'none'}</span>
      <button
        data-testid='set-dirty'
        onClick={() =>
          setDirtyState({
            isDirty: true,
            label: 'Save Changes',
            onSave: () => Promise.resolve(),
            isSaving: false
          })
        }
      >
        Set Dirty
      </button>
      <button data-testid='clear-dirty' onClick={() => setDirtyState(null)}>
        Clear
      </button>
    </div>
  );
}

describe('FabDirtyContext', () => {
  it('provides null dirtyState by default', () => {
    render(
      <FabDirtyProvider>
        <ContextConsumer />
      </FabDirtyProvider>
    );

    expect(screen.getByTestId('is-dirty').textContent).toBe('null');
    expect(screen.getByTestId('label').textContent).toBe('none');
  });

  it('updates dirtyState when setDirtyState is called', () => {
    render(
      <FabDirtyProvider>
        <ContextConsumer />
      </FabDirtyProvider>
    );

    fireEvent.click(screen.getByTestId('set-dirty'));

    expect(screen.getByTestId('is-dirty').textContent).toBe('true');
    expect(screen.getByTestId('label').textContent).toBe('Save Changes');
  });

  it('clears dirtyState when setDirtyState(null) is called', () => {
    render(
      <FabDirtyProvider>
        <ContextConsumer />
      </FabDirtyProvider>
    );

    fireEvent.click(screen.getByTestId('set-dirty'));
    expect(screen.getByTestId('is-dirty').textContent).toBe('true');

    fireEvent.click(screen.getByTestId('clear-dirty'));
    expect(screen.getByTestId('is-dirty').textContent).toBe('null');
  });
});
