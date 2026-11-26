import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ResearchPage from '../research-page';
import { makeProgress, TITLE_MAP } from './research-fixtures';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams('view=research'),
  usePathname: () => '/research'
}));

vi.mock('@/context/fabContext', () => ({
  useFab: () => ({
    dispatch: vi.fn()
  })
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'PAT-1',
        role_name: 'Patient'
      }
    },
    isLoading: false
  })
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: () => ({
    data: makeProgress({ consentedStudyIds: ['research'] }),
    isLoading: false
  }),
  useConsentToStudy: () => ({
    mutate: vi.fn(),
    isPending: false
  })
}));

vi.mock('@/hooks/useReferralWrite', () => ({
  useReferralWrite: vi.fn()
}));

vi.mock('@/hooks/useWaitingSubmissions', () => ({
  useWaitingSubmissions: () => [
    {
      questionnaire: 'Questionnaire/phq2',
      authored: '2026-08-10T10:00:00Z'
    }
  ]
}));

vi.mock('@/services/api/questionnaire-info', () => ({
  useQuestionnaireTitles: () => ({
    data: TITLE_MAP,
    isPending: false
  }),
  EMPTY_QUESTIONNAIRE_INFO_MAP: new Map()
}));

vi.mock('@/services/api/researcher', () => ({
  useResearcherDashboard: () => ({
    data: undefined,
    isLoading: false
  })
}));

vi.mock('@/services/api/research-counts', () => ({
  useStudyParticipantCount: () => ({ data: undefined })
}));

vi.mock('../research-content', () => ({
  default: (props: Record<string, unknown>) => (
    <div
      data-testid='research-content'
      data-practitioner={String(props.practitionerId ?? '')}
      data-active={String(props.activeStudyId ?? '')}
      data-waiting={(props.waiting as unknown[] | undefined)?.length ?? 0}
      data-consented={[
        ...((props.consentedStudyIds as Set<string> | undefined) ?? [])
      ].join(',')}
    />
  )
}));

vi.mock('../consent-drawer', () => ({
  default: () => <div data-testid='consent-drawer' />
}));

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header' />
}));

vi.mock('@/components/general/content-wraper', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <div data-testid='content-wrapper'>{children}</div>
  )
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('ResearchPage wiring', () => {
  it('wraps the page content in the wide layout', () => {
    render(<ResearchPage />, { wrapper: createWrapper() });
    const researchContent = screen.getByTestId('research-content');
    const layout = researchContent.closest('[data-layout]');
    expect(layout).not.toBeNull();
    expect(layout).toHaveAttribute('data-layout', 'wide');
  });

  it('passes waiting responses and consented study ids to ResearchContent', () => {
    render(<ResearchPage />, { wrapper: createWrapper() });
    const researchContent = screen.getByTestId('research-content');
    expect(researchContent).toHaveAttribute('data-waiting', '1');
    expect(researchContent).toHaveAttribute('data-consented', 'research');
  });
});
