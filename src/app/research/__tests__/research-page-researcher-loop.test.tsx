vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

import { createQueryClient } from '@/__tests__/test-utils';
import type { FabAction } from '@/context/fabContext';
import { FabProvider } from '@/context/fabContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import type { Dispatch, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearchPage from '../research-page';
import { TITLE_MAP } from './research-fixtures';

/** Counts every FAB dispatch while forwarding to the real reducer. */
const fabProbe = vi.hoisted(() => ({
  count: 0,
  target: { current: (_action: unknown) => {} }
}));

/** Props the research page passes to the research content facade. */
const contentProbe = vi.hoisted(() => ({
  current: {} as Record<string, unknown>
}));

vi.mock('@/context/fabContext', async importOriginal => {
  const actual = await importOriginal<typeof import('@/context/fabContext')>();
  /** Stable dispatch wrapper so the effect never sees a new identity. */
  const countedDispatch = (action: FabAction) => {
    fabProbe.count += 1;
    fabProbe.target.current(action);
  };
  return {
    ...actual,
    useFab: () => {
      const context = actual.useFab();
      fabProbe.target.current = context.dispatch as (action: unknown) => void;
      return {
        state: context.state,
        dispatch: countedDispatch as Dispatch<FabAction>
      };
    }
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/research'
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: { userInfo: { role_name: 'Researcher' } },
    isLoading: false
  })
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: () => ({ data: undefined, isLoading: false }),
  useConsentToStudy: () => ({ mutate: vi.fn(), isPending: false })
}));

vi.mock('@/services/api/questionnaire-info', () => ({
  useQuestionnaireTitles: () => ({ data: TITLE_MAP, isPending: false }),
  EMPTY_QUESTIONNAIRE_INFO_MAP: new Map()
}));

vi.mock('@/services/api/researcher', () => ({
  useResearcherDashboard: () => ({ data: undefined, isLoading: false })
}));

vi.mock('@/services/api/research-counts', () => ({
  usePerQuestionnaireCounts: () => ({ data: new Map() }),
  useStudyParticipantCount: () => ({ data: undefined })
}));

vi.mock('@/hooks/useReferralWrite', () => ({ useReferralWrite: vi.fn() }));
vi.mock('@/hooks/useWaitingSubmissions', () => ({
  useWaitingSubmissions: () => []
}));
vi.mock('react-toastify', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

vi.mock('../research-content', () => ({
  default: (props: Record<string, unknown>) => {
    contentProbe.current = props;
    return <div data-testid='research-content' />;
  }
}));
vi.mock('../consent-drawer', () => ({ default: () => <div /> }));
vi.mock('@/components/page-header', () => ({ default: () => <div /> }));
vi.mock('@/components/general/content-wraper', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));

/** Flushes pending effects and timers. */
async function flush(): Promise<void> {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 30));
  });
}

beforeEach(() => {
  fabProbe.count = 0;
  contentProbe.current = {};
});

describe('ResearchPage researcher FAB loop', () => {
  it('does not pass retired carousel props to the research content', () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <FabProvider>
          <ResearchPage />
        </FabProvider>
      </QueryClientProvider>
    );

    expect(contentProbe.current).not.toHaveProperty('activeStudyId');
    expect(contentProbe.current).not.toHaveProperty('practitionerId');
    expect(contentProbe.current).not.toHaveProperty('onSlideChange');
    expect(contentProbe.current).not.toHaveProperty('onResearcherStudyClick');
  });
  it('stops dispatching FAB actions after mount when progress is undefined', async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <FabProvider>
          <ResearchPage />
        </FabProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(fabProbe.count).toBeGreaterThan(0);
    });

    await flush();
    const settled = fabProbe.count;

    await flush();

    expect(fabProbe.count).toBe(settled);
    expect(fabProbe.count).toBeLessThan(10);
  });
});
