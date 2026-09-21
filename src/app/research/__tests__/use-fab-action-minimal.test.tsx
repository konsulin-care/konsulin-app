import { FabProvider, useFab } from '@/context/fabContext';
import { render, screen, waitFor } from '@testing-library/react';
import { useMemo, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ResearchFormActionsProvider } from '../research-form-actions-context';
import { useResearchFabAction } from '../use-fab-action';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/research/register'),
  useSearchParams: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue('title')
  })
}));

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

function HookCaller({
  canAdvance,
  push
}: {
  canAdvance: boolean;
  push: { push: (url: string) => void };
}) {
  const router = useMemo(() => push, [push]);
  const participate = useMemo(() => () => {}, []);

  useResearchFabAction({
    isResearcher: true,
    activeStudy: null,
    participate,
    router
  });

  return null;
}

function Wrapper({
  canAdvance,
  children
}: {
  canAdvance: boolean;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      canAdvance,
      onAdvance: vi.fn(),
      onSubmit: vi.fn()
    }),
    [canAdvance]
  );

  return (
    <FabProvider>
      <ResearchFormActionsProvider value={value}>
        {children}
        <FabStateReader />
      </ResearchFormActionsProvider>
    </FabProvider>
  );
}

describe('useResearchFabAction', () => {
  it('dispatches Next disabled=true when canAdvance is false', async () => {
    const push = vi.fn();

    render(
      <Wrapper canAdvance={false}>
        <HookCaller canAdvance={false} push={{ push }} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('fab-label')).toHaveTextContent('none');
    });

    expect(screen.getByTestId('fab-disabled')).toHaveTextContent('true');
  });
});
