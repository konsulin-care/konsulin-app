import type { ResearchProgress, StudyProgress } from '@/utils/fhir/research';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearchProgressCard from '../research-progress-card';

const { mockUseResearchProgress } = vi.hoisted(() => ({
  mockUseResearchProgress: vi.fn()
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: mockUseResearchProgress
}));

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<
    () => {
      state: {
        isAuthenticated: boolean;
        userInfo: { role_name?: string };
      };
    }
  >()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

function mockPatientAuth() {
  mockUseAuth.mockReturnValue({
    state: { isAuthenticated: true, userInfo: { role_name: 'Patient' } }
  });
}

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

function makeProgress(): ResearchProgress {
  const study: StudyProgress = {
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
  };

  return {
    studies: [study],
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
}

describe('ResearchProgressCard', () => {
  it('renders the study copy, batch progress, and level, linking to /research', () => {
    mockPatientAuth();
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchProgressCard />, { wrapper: createWrapper() });

    const card = screen.getByTestId('assessments-research-card');
    expect(card.getAttribute('href')).toBe('/research');
    expect(
      screen.getByText(/Every questionnaire you complete counts toward/i)
    ).toBeTruthy();
    expect(screen.getByText(/Batch 1 · 1\/2/)).toBeTruthy();
    expect(screen.getByText('Participant')).toBeTruthy();
    expect(screen.getByText(/Continue/)).toBeTruthy();
  });

  it('renders nothing while loading', () => {
    mockPatientAuth();
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: true
    });

    render(<ResearchProgressCard />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('assessments-research-card')).toBeNull();
  });

  it('renders nothing when no active study exists', () => {
    mockPatientAuth();
    mockUseResearchProgress.mockReturnValue({
      data: { ...makeProgress(), studies: [] },
      isLoading: false
    });

    render(<ResearchProgressCard />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('assessments-research-card')).toBeNull();
  });

  it('renders for guests', () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} }
    });
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchProgressCard />, { wrapper: createWrapper() });

    expect(screen.getByTestId('assessments-research-card')).toBeTruthy();
  });

  it('hides for practitioners and admins', () => {
    mockUseAuth.mockReturnValue({
      state: { isAuthenticated: true, userInfo: { role_name: 'Practitioner' } }
    });
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchProgressCard />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('assessments-research-card')).toBeNull();
  });
});
