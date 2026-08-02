import type { ResearchProgress } from '@/utils/fhir/research';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PageHeader from '../page-header';

const { mockUseAuth, mockUseResearchProgress, mockPathname } = vi.hoisted(
  () => ({
    mockUseAuth: vi.fn<
      () => {
        isLoading: boolean;
        state: {
          isAuthenticated: boolean;
          userInfo: { role_name?: string; fhirId?: string; fullname?: string };
        };
      }
    >(),
    mockUseResearchProgress: vi.fn(),
    mockPathname: { current: '/' }
  })
);

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => mockPathname.current
}));

vi.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: () => ({ appointmentData: null, sessionData: null })
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: mockUseResearchProgress
}));

vi.mock('@/components/role-avatar-popup', () => ({
  default: () => <div data-testid='role-avatar' />
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui' },
  dbGet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const BATCH_1 = {
  id: 'batch-1',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq2', 'big-five-inventory']
};

const PROGRESS_DATA: ResearchProgress = {
  studies: [
    {
      study: {
        resourceType: 'ResearchStudy',
        id: 'research',
        status: 'active',
        title: 'Konsulin Mental Health Survey'
      },
      batches: [BATCH_1],
      currentBatch: BATCH_1,
      completedCount: 1,
      totalCount: 2,
      isComplete: false,
      firstUncompletedQuestionnaireId: 'big-five-inventory',
      completedQuestionnaireIds: ['phq2'],
      history: [
        {
          batchId: 'batch-1',
          start: '2026-08-01',
          end: '2026-08-31',
          participated: true
        }
      ],
      consecutiveBatches: 1
    }
  ],
  cumulativeResponses: 1,
  currentLevel: { threshold: 1, label: 'Participant', reward: 'brief' },
  nextLevel: { threshold: 5, label: 'Contributor', reward: 'report' },
  levelProgress: {
    current: { threshold: 1, label: 'Participant', reward: 'brief' },
    next: { threshold: 5, label: 'Contributor', reward: 'report' },
    currentThreshold: 1,
    nextThreshold: 5,
    intoNext: 0,
    toNext: 4
  },
  completedQuestionnaireIds: ['phq2']
};

/** The widget must be hidden by role gating, not by a missing data source. */
beforeEach(() => {
  mockPathname.current = '/';
  mockUseResearchProgress.mockReturnValue({
    data: PROGRESS_DATA,
    isLoading: false
  });
});

function renderHeader() {
  return render(<PageHeader />, { wrapper: createWrapper() });
}

describe('PageHeader research widget gating', () => {
  it('shows the widget for patients', () => {
    mockPathname.current = '/';
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Patient', fhirId: 'P1', fullname: 'Test' }
      }
    });

    renderHeader();
    expect(screen.getByTestId('research-header-widget')).toBeTruthy();
  });

  it('shows the widget for guests', () => {
    mockPathname.current = '/';
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: { isAuthenticated: false, userInfo: {} }
    });

    renderHeader();
    expect(screen.getByTestId('research-header-widget')).toBeTruthy();
  });

  it('hides the widget for practitioners', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Practitioner', fhirId: 'PR1' }
      }
    });

    renderHeader();
    expect(screen.queryByTestId('research-header-widget')).toBeNull();
  });

  it('hides the widget for clinic admins', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: { isAuthenticated: true, userInfo: { role_name: 'Clinic Admin' } }
    });

    renderHeader();
    expect(screen.queryByTestId('research-header-widget')).toBeNull();
  });

  it('hides the widget on the /research page', () => {
    mockPathname.current = '/research';
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Patient', fhirId: 'P1', fullname: 'Test' }
      }
    });

    renderHeader();
    expect(screen.queryByTestId('research-header-widget')).toBeNull();
  });

  it('hides the widget while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      state: { isAuthenticated: false, userInfo: {} }
    });

    renderHeader();
    expect(screen.queryByTestId('research-header-widget')).toBeNull();
  });
});
