import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FabProvider, resolveMode, useFab } from '../fabContext';

/** Helper to read context state via the hook. */
function ContextConsumer() {
  const { state, dispatch } = useFab();
  const mode = resolveMode(state);
  return (
    <div>
      <span data-testid='mode'>{mode.type}</span>
      <span data-testid='panel-open'>{String(state.panelOpen)}</span>
      <span data-testid='has-action'>{String(state.action !== null)}</span>
      <span data-testid='has-selection'>
        {String(state.selection !== null)}
      </span>
      <span data-testid='has-menu'>{String(state.menu !== null)}</span>
      <button
        data-testid='set-action'
        onClick={() =>
          dispatch({
            type: 'SET_ACTION',
            config: { label: 'Save', onAction: () => Promise.resolve() }
          })
        }
      >
        Set Action
      </button>
      <button
        data-testid='clear-action'
        onClick={() => dispatch({ type: 'SET_ACTION', config: null })}
      >
        Clear Action
      </button>
      <button
        data-testid='set-selection'
        onClick={() =>
          dispatch({
            type: 'SET_SELECTION',
            config: {
              count: 3,
              onDelete: () => {
                /* noop */
              },
              onCancel: () => {
                /* noop */
              }
            }
          })
        }
      >
        Set Selection
      </button>
      <button
        data-testid='clear-selection'
        onClick={() => dispatch({ type: 'SET_SELECTION', config: null })}
      >
        Clear Selection
      </button>
      <button
        data-testid='set-menu'
        onClick={() =>
          dispatch({
            type: 'SET_MENU',
            config: { icon: () => null, actions: [] }
          })
        }
      >
        Set Menu
      </button>
      <button
        data-testid='clear-menu'
        onClick={() => dispatch({ type: 'SET_MENU', config: null })}
      >
        Clear Menu
      </button>
      <button
        data-testid='toggle-panel'
        onClick={() => dispatch({ type: 'TOGGLE_PANEL' })}
      >
        Toggle
      </button>
      <button
        data-testid='close-panel'
        onClick={() => dispatch({ type: 'CLOSE_PANEL' })}
      >
        Close
      </button>
      <button
        data-testid='clear-all'
        onClick={() => dispatch({ type: 'CLEAR_ALL' })}
      >
        Clear All
      </button>
    </div>
  );
}

function renderFab() {
  return render(
    <FabProvider>
      <ContextConsumer />
    </FabProvider>
  );
}

describe('FabContext', () => {
  it('starts in idle mode with panel closed', () => {
    renderFab();
    expect(screen.getByTestId('mode').textContent).toBe('idle');
    expect(screen.getByTestId('panel-open').textContent).toBe('false');
  });

  it('transitions to action mode via SET_ACTION', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('set-action'));
    expect(screen.getByTestId('mode').textContent).toBe('action');
    expect(screen.getByTestId('panel-open').textContent).toBe('false');
  });

  it('clears action mode via SET_ACTION null', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('set-action'));
    expect(screen.getByTestId('mode').textContent).toBe('action');
    fireEvent.click(screen.getByTestId('clear-action'));
    expect(screen.getByTestId('mode').textContent).toBe('idle');
  });

  it('transitions to selection mode via SET_SELECTION', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('set-selection'));
    expect(screen.getByTestId('mode').textContent).toBe('selection');
  });

  it('selection takes priority over action', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('set-action'));
    expect(screen.getByTestId('mode').textContent).toBe('action');
    fireEvent.click(screen.getByTestId('set-selection'));
    expect(screen.getByTestId('mode').textContent).toBe('selection');
  });

  it('action takes priority over menu', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('set-menu'));
    expect(screen.getByTestId('mode').textContent).toBe('menu');
    fireEvent.click(screen.getByTestId('set-action'));
    expect(screen.getByTestId('mode').textContent).toBe('action');
  });

  it('menu mode works when no action or selection', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('set-menu'));
    expect(screen.getByTestId('mode').textContent).toBe('menu');
  });

  it('transitions back to idle after selection cleared', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('set-selection'));
    fireEvent.click(screen.getByTestId('clear-selection'));
    expect(screen.getByTestId('mode').textContent).toBe('idle');
  });

  it('restores action mode after selection cleared', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('set-action'));
    fireEvent.click(screen.getByTestId('set-selection'));
    expect(screen.getByTestId('mode').textContent).toBe('selection');
    fireEvent.click(screen.getByTestId('clear-selection'));
    expect(screen.getByTestId('mode').textContent).toBe('action');
  });

  it('TOGGLE_PANEL flips panelOpen', () => {
    renderFab();
    expect(screen.getByTestId('panel-open').textContent).toBe('false');
    fireEvent.click(screen.getByTestId('toggle-panel'));
    expect(screen.getByTestId('panel-open').textContent).toBe('true');
    fireEvent.click(screen.getByTestId('toggle-panel'));
    expect(screen.getByTestId('panel-open').textContent).toBe('false');
  });

  it('CLOSE_PANEL sets panelOpen to false', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('toggle-panel'));
    expect(screen.getByTestId('panel-open').textContent).toBe('true');
    fireEvent.click(screen.getByTestId('close-panel'));
    expect(screen.getByTestId('panel-open').textContent).toBe('false');
  });

  it('setting a mode closes the panel', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('toggle-panel'));
    expect(screen.getByTestId('panel-open').textContent).toBe('true');
    fireEvent.click(screen.getByTestId('set-action'));
    expect(screen.getByTestId('panel-open').textContent).toBe('false');
  });

  it('CLEAR_ALL resets everything', () => {
    renderFab();
    fireEvent.click(screen.getByTestId('set-action'));
    fireEvent.click(screen.getByTestId('set-menu'));
    fireEvent.click(screen.getByTestId('toggle-panel'));
    fireEvent.click(screen.getByTestId('clear-all'));
    expect(screen.getByTestId('mode').textContent).toBe('idle');
    expect(screen.getByTestId('panel-open').textContent).toBe('false');
    expect(screen.getByTestId('has-action').textContent).toBe('false');
    expect(screen.getByTestId('has-selection').textContent).toBe('false');
    expect(screen.getByTestId('has-menu').textContent).toBe('false');
  });
});
