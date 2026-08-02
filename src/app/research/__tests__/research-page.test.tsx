import type { ResearchProgress, StudyProgress } from '@/utils/fhir/research';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearchPage from '../research-page';

const { mockUseResearchProgress, mockPush } = vi.hoisted(() => ({
  mockUseResearchProgress: vi.fn(),
  mockPush: vi.fn()
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: mockUseResearchProgress
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn(() => ({
    state: { userInfo: {} },
    isLoading: false
  }))
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/research'
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

function makeStudyProgress(overrides?: Partial<StudyProgress>): StudyProgress {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id: 'research',
      status: 'active',
      title: 'Konsulin Mental Health Survey',
      description: 'A longitudinal survey of mental health.',
      period: { start: '2026-08-01', end: '2027-07-31' }
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
    consecutiveBatches: 1,
    ...overrides
  };
}

function makeProgress(overrides?: Partial<ResearchProgress>): ResearchProgress {
  return {
    studies: [makeStudyProgress()],
    cumulativeResponses: 1,
    currentLevel: {
      threshold: 1,
      label: 'Participant',
      reward: 'Standard result brief for every questionnaire'
    },
    nextLevel: {
      threshold: 5,
      label: 'Contributor',
      reward: 'Personalized summary report + badge'
    },
    levelProgress: {
      current: {
        threshold: 1,
        label: 'Participant',
        reward: 'Standard result brief for every questionnaire'
      },
      next: {
        threshold: 5,
        label: 'Contributor',
        reward: 'Personalized summary report + badge'
      },
      currentThreshold: 1,
      nextThreshold: 5,
      intoNext: 0,
      toNext: 4
    },
    completedQuestionnaireIds: ['phq2'],
    ...overrides
  };
}

describe('ResearchPage', () => {
  it('shows a loading state while the progress query is pending', () => {
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: true
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('research-loading')).toBeTruthy();
  });

  it('renders the hero with the study title, description, and batch progress', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(
      screen.getAllByText('Konsulin Mental Health Survey').length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/A longitudinal survey of mental health/)
    ).toBeTruthy();
    expect(screen.getByText(/Closes in \d+ days/i)).toBeTruthy();
    expect(screen.getAllByText('1/2 questionnaires').length).toBeGreaterThan(0);
  });

  it('links the hero CTA to the first uncompleted questionnaire', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    const cta = screen.getByRole('link', { name: /participate/i });
    expect(cta.getAttribute('href')).toBe('/assessments?id=big-five-inventory');
  });

  it('renders a completion state instead of a stale CTA when the batch is done', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({
        studies: [
          makeStudyProgress({
            completedCount: 2,
            isComplete: true,
            firstUncompletedQuestionnaireId: null,
            completedQuestionnaireIds: ['phq2', 'big-five-inventory']
          })
        ]
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/You've completed this batch/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /participate/i })).toBeNull();
  });

  it('shows an empty state when there are no active studies', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({ studies: [] }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByText('No ongoing research')).toBeTruthy();
  });

  it('renders the batch timeline with chips and the consecutive-batch message', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('batch-chip-batch-1')).toBeTruthy();
    expect(screen.getByText(/You've completed 1 batch in a row/i)).toBeTruthy();
  });

  it('renders the level card and rewards vault from cumulative responses', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Level Participant')).toBeTruthy();
    expect(screen.getByText('Rewards vault')).toBeTruthy();
    expect(
      screen.getByText(/Standard result brief for every questionnaire/)
    ).toBeTruthy();
    // Contributor is still locked at 1 cumulative response.
    expect(
      screen.getByText(/Personalized summary report \+ badge/)
    ).toBeTruthy();
  });

  it('marks completed questionnaires and shows overlap hints across studies', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress({
        studies: [
          makeStudyProgress(),
          makeStudyProgress({
            study: {
              resourceType: 'ResearchStudy',
              id: 'study-b',
              status: 'active',
              title: 'Study B'
            },
            completedCount: 0,
            completedQuestionnaireIds: [],
            firstUncompletedQuestionnaireId: 'phq2'
          })
        ]
      }),
      isLoading: false
    });

    render(<ResearchPage />, { wrapper: createWrapper() });

    expect(screen.getAllByText('PHQ2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BIG FIVE INVENTORY').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/also counts toward Study B/i).length
    ).toBeGreaterThan(0);
  });
});
