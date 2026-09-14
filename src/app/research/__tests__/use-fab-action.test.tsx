import { FabProvider, useFab } from '@/context/fabContext';
import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ResearchFormActionsProvider } from '../research-form-actions-context';
import { useResearchFabAction } from '../use-fab-action';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/research/register'),
  useSearchParams: vi
    .fn()
    .mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    )
}));

/** Reads FAB action config from context. */
function FabStateReader() {
  const { state } = useFab();
  const action = state.action;
  return (
    <div>
      <span data-testid='fab-label'>{action?.label ?? 'none'}</span>
      <span data-testid='fab-disabled'>
        {String(action?.disabled ?? false)}
      </span>
    </div>
  );
}

/** Invokes useResearchFabAction and renders FabStateReader. */
function TestHarness() {
  const router = useMemo(() => ({ push: vi.fn() }), []);
  const participate = useMemo(() => () => {}, []);

  useResearchFabAction({
    isResearcher: true,
    activeStudy: null,
    participate,
    router
  });

  return <FabStateReader />;
}

function renderWithFab(ui: React.ReactElement) {
  return render(<FabProvider>{ui}</FabProvider>);
}

describe('useResearchFabAction on research form pages', () => {
  it('dispatches Next disabled=true when canAdvance is false', async () => {
    renderWithFab(
      <ResearchFormActionsProvider
        value={{
          canAdvance: false,
          onAdvance: vi.fn(),
          onSubmit: vi.fn()
        }}
      >
        <TestHarness />
      </ResearchFormActionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('fab-label')).toHaveTextContent('Next');
    });

    expect(screen.getByTestId('fab-disabled')).toHaveTextContent('true');
  });

  it('dispatches Next disabled=false when canAdvance is true', async () => {
    renderWithFab(
      <ResearchFormActionsProvider
        value={{
          canAdvance: true,
          onAdvance: vi.fn(),
          onSubmit: vi.fn()
        }}
      >
        <TestHarness />
      </ResearchFormActionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('fab-label')).toHaveTextContent('Next');
    });

    expect(screen.getByTestId('fab-disabled')).toHaveTextContent('false');
  });

  it('dispatches Submit when page=batch', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=batch') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    renderWithFab(
      <ResearchFormActionsProvider
        value={{
          canAdvance: true,
          onAdvance: vi.fn(),
          onSubmit: vi.fn()
        }}
      >
        <TestHarness />
      </ResearchFormActionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('fab-label')).toHaveTextContent('Submit');
    });
  });

  it('dispatches Next when page=questionnaire', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=questionnaire') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    renderWithFab(
      <ResearchFormActionsProvider
        value={{
          canAdvance: true,
          onAdvance: vi.fn(),
          onSubmit: vi.fn()
        }}
      >
        <TestHarness />
      </ResearchFormActionsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('fab-label')).toHaveTextContent('Next');
    });
  });
});
