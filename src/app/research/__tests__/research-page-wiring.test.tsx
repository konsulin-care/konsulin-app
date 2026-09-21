import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ResearchPage from '../research-page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/research'
}));

// Mock useFab
vi.mock('@/context/fab', () => ({
  useFab: () => ({
    dispatch: vi.fn()
  })
}));

// Mock useAuth
vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: {
      userInfo: {
        fhirId: 'practitioner-1',
        role_name: 'Researcher'
      }
    },
    isLoading: false
  })
}));

// Mock useResearchProgress and useConsentToStudy
vi.mock('@/services/api/research', () => ({
  useResearchProgress: () => ({
    data: undefined,
    isLoading: false
  }),
  useConsentToStudy: () => ({
    mutate: vi.fn(),
    isPending: false
  }),
  EMPTY_QUESTIONNAIRE_INFO_MAP: new Map()
}));

// Mock useReferralWrite
vi.mock('@/hooks/useReferralWrite', () => ({
  useReferralWrite: vi.fn()
}));

// Mock useQuestionnaireTitles
vi.mock('@/services/api/questionnaire-info', () => ({
  useQuestionnaireTitles: () => ({
    data: new Map(),
    isPending: false
  }),
  EMPTY_QUESTIONNAIRE_INFO_MAP: new Map()
}));

// Mock useResearcherDashboard
vi.mock('@/services/api/researcher', () => ({
  useResearcherDashboard: () => ({
    data: undefined,
    isLoading: false
  })
}));

// Mock usePerQuestionnaireCounts
vi.mock('@/services/api/research-counts', () => ({
  usePerQuestionnaireCounts: () => ({
    data: undefined
  })
}));

// Mock ResearchContent
vi.mock('../research-content', () => ({
  default: ({
    practitionerId,
    activeStudyId
  }: {
    practitionerId?: string;
    activeStudyId: string;
  }) => (
    <div
      data-testid='research-content'
      data-practitioner={practitionerId}
      data-active={activeStudyId}
    />
  )
}));

// Mock other drawer components
vi.mock('../study-detail-view', () => ({
  default: () => <div data-testid='study-detail-view' />
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
  it('passes practitionerId and activeStudyId to ResearchContent', () => {
    render(<ResearchPage />, { wrapper: createWrapper() });
    const researchContent = screen.getByTestId('research-content');
    expect(researchContent).toHaveAttribute(
      'data-practitioner',
      'practitioner-1'
    );
    // activeStudyId defaults to empty string
    expect(researchContent).toHaveAttribute('data-active', '');
  });
});
