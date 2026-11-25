vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import type { ActionConfig } from '@/components/fab/types';
import { FabProvider, useFab } from '@/context/fabContext';
import type { StudyProgress } from '@/utils/fhir/research';
import { render, screen, waitFor } from '@testing-library/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResearchFormActionsProvider } from '../research-form-actions-context';
import { useResearchFabAction } from '../use-fab-action';
import { makeStudyProgress } from './research-fixtures';

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
  const iconName = action?.icon?.displayName ?? action?.icon?.name ?? 'unknown';
  return (
    <div>
      <span data-testid='fab-label'>{action?.label ?? 'none'}</span>
      <span data-testid='fab-disabled'>
        {String(action?.disabled ?? false)}
      </span>
      <span data-testid='fab-icon'>{iconName}</span>
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

/** Mutable holder for the latest FAB action config. */
interface Probe {
  current: ActionConfig | null;
}

/** Captures the latest FAB action config without rendering UI. */
function FabActionProbe({ probe }: { probe: Probe }) {
  const { state } = useFab();
  probe.current = state.action;
  return null;
}

/** Hook caller whose props can change between renders. */
function ListHarness({
  probe,
  participate,
  activeStudy
}: {
  probe: Probe;
  participate: (study: StudyProgress) => void;
  activeStudy: StudyProgress | null;
}) {
  const router = useMemo(() => ({ push: vi.fn() }), []);

  useResearchFabAction({
    isResearcher: false,
    activeStudy,
    participate,
    router
  });

  return <FabActionProbe probe={probe} />;
}

function renderWithFab(ui: React.ReactElement) {
  return render(<FabProvider>{ui}</FabProvider>);
}

/** Hook caller for the researcher research-list action. */
function ResearcherListHarness({ probe }: { probe: Probe }) {
  const router = useMemo(() => ({ push: vi.fn() }), []);
  const participate = useMemo(() => () => {}, []);

  useResearchFabAction({
    isResearcher: true,
    activeStudy: null,
    participate,
    router
  });

  return <FabActionProbe probe={probe} />;
}

describe('useResearchFabAction stability on the research list page', () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue('/research');
  });

  afterEach(() => {
    vi.mocked(usePathname).mockReturnValue('/research/register');
  });

  it('does not dispatch again when only the participate identity changes', () => {
    const probe: Probe = { current: null };
    const study = makeStudyProgress();
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderWithFab(
      <ListHarness probe={probe} participate={first} activeStudy={study} />
    );

    const dispatched = probe.current;
    expect(dispatched?.label).toBe('Participate');

    rerender(
      <FabProvider>
        <ListHarness probe={probe} participate={second} activeStudy={study} />
      </FabProvider>
    );

    expect(probe.current).toBe(dispatched);
  });

  it('invokes the latest participate callback after a re-render', () => {
    const probe: Probe = { current: null };
    const study = makeStudyProgress();
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderWithFab(
      <ListHarness probe={probe} participate={first} activeStudy={study} />
    );

    rerender(
      <FabProvider>
        <ListHarness probe={probe} participate={second} activeStudy={study} />
      </FabProvider>
    );

    probe.current?.onAction();

    expect(second).toHaveBeenCalledWith(study);
    expect(first).not.toHaveBeenCalled();
  });
});

describe('useResearchFabAction on the research list page', () => {
  afterEach(() => {
    vi.mocked(usePathname).mockReturnValue('/research/register');
  });

  it('labels the researcher action with the register_survey message', () => {
    vi.mocked(usePathname).mockReturnValue('/research');
    const probe: Probe = { current: null };

    renderWithFab(<ResearcherListHarness probe={probe} />);

    expect(probe.current?.label).toBe('Register Survey');
  });
});

describe('useResearchFabAction on research form pages', () => {
  it('dispatches a labelled next_step action disabled=true when canAdvance is false', async () => {
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

  it('dispatches a labelled next_step action disabled=false when canAdvance is true', async () => {
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

  it('dispatches Submit with label when page=batch', async () => {
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

  it('dispatches the submit label when page=questionnaire', async () => {
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
