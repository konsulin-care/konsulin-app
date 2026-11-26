import { FabProvider, useFab } from '@/context/fabContext';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContentActionBar from '../content-action-bar';

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(
    () => (key: string, values?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        page_actions: 'Page actions',
        cancel_selection: 'Cancel',
        delete_count: 'Delete ({count})'
      };
      return (translations[key] ?? key).replace(
        '{count}',
        String(values?.count ?? '')
      );
    }
  )
}));

function Harness() {
  const { dispatch } = useFab();
  return (
    <div>
      <ContentActionBar />
      <button
        data-testid='trigger-action'
        onClick={() =>
          dispatch({
            type: 'SET_ACTION',
            config: { label: 'Submit', onAction: vi.fn() }
          })
        }
      />
      <button
        data-testid='trigger-saving'
        onClick={() =>
          dispatch({
            type: 'SET_ACTION',
            config: { label: 'Submit', onAction: vi.fn(), isSaving: true }
          })
        }
      />
      <button
        data-testid='trigger-selection'
        onClick={() =>
          dispatch({
            type: 'SET_SELECTION',
            config: { count: 3, onDelete: vi.fn(), onCancel: vi.fn() }
          })
        }
      />
      <button
        data-testid='trigger-idle'
        onClick={() => dispatch({ type: 'CLEAR_ALL' })}
      />
    </div>
  );
}

function renderHarness() {
  return render(
    <FabProvider>
      <Harness />
    </FabProvider>
  );
}

describe('ContentActionBar', () => {
  it('renders nothing when the FAB state is idle', () => {
    const { container } = renderHarness();
    expect(
      container.querySelector('[data-slot="content-action-bar"]')
    ).toBeNull();
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('renders the labelled action button in a region named page_actions', () => {
    renderHarness();
    fireEvent.click(screen.getByTestId('trigger-action'));

    const region = screen.getByRole('region', { name: 'Page actions' });
    expect(region.getAttribute('data-slot')).toBe('content-action-bar');
    const button = screen.getByRole('button', { name: /Submit/ });
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByTestId('content-action-spinner')).toBeNull();
    expect(button.className).toContain('bg-secondary');
    expect(button.className).toContain('text-secondary-foreground');
    expect(button.className).toContain('border-turquoise-deep');
    expect(button.className).toContain('font-semibold');
  });

  it('keeps the saving action mounted, disabled, with a spinner beside the label', () => {
    renderHarness();
    fireEvent.click(screen.getByTestId('trigger-saving'));

    const button = screen.getByRole('button', { name: /Submit/ });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('content-action-spinner')).not.toBeNull();
    expect(button.textContent).toContain('Submit');
  });

  it('renders cancel and delete-count buttons side by side in selection mode', () => {
    renderHarness();
    fireEvent.click(screen.getByTestId('trigger-selection'));

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const remove = screen.getByRole('button', { name: /Delete \(3\)/ });

    expect(cancel.parentElement).toBe(remove.parentElement);
    expect(cancel.parentElement?.getAttribute('data-slot')).toBe(
      'content-action-bar'
    );
  });

  it('returns to nothing after clearing all state', () => {
    renderHarness();
    fireEvent.click(screen.getByTestId('trigger-action'));
    expect(screen.getByRole('region')).not.toBeNull();

    fireEvent.click(screen.getByTestId('trigger-idle'));
    expect(screen.queryByRole('region')).toBeNull();
  });
});
