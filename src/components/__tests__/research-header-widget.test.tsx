import type { ResearchProgress, StudyProgress } from '@/utils/fhir/research';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearchHeaderWidget from '../research/research-header-widget';

const { mockUseResearchProgress } = vi.hoisted(() => ({
  mockUseResearchProgress: vi.fn()
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: mockUseResearchProgress
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
  start: '2026-07-01',
  end: '2026-07-31',
  questionnaireIds: ['phq2', 'big-five-inventory', 'gad7']
};

const BATCH_2 = {
  id: 'batch-2',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq2', 'who5', 'pss4']
};

const BATCH_3 = {
  id: 'batch-3',
  start: '2026-09-01',
  end: '2026-09-30',
  questionnaireIds: ['big-five-inventory', 'gad7', 'who5']
};

function makeProgress(): ResearchProgress {
  const study: StudyProgress = {
    study: {
      resourceType: 'ResearchStudy',
      id: 'research',
      status: 'active',
      title: 'Konsulin Mental Health Survey'
    },
    batches: [BATCH_1, BATCH_2, BATCH_3],
    currentBatch: BATCH_2,
    completedCount: 1,
    totalCount: 3,
    isComplete: false,
    firstUncompletedQuestionnaireId: 'who5',
    completedQuestionnaireIds: ['phq2'],
    history: [
      {
        batchId: 'batch-1',
        start: '2026-07-01',
        end: '2026-07-31',
        participated: true
      },
      {
        batchId: 'batch-2',
        start: '2026-08-01',
        end: '2026-08-31',
        participated: true
      },
      {
        batchId: 'batch-3',
        start: '2026-09-01',
        end: '2026-09-30',
        participated: false
      }
    ],
    consecutiveBatches: 2
  };

  return {
    studies: [study],
    cumulativeResponses: 1,
    questionnaireResponses: ['phq2'],
    questionnaireXp: 8,
    completedQuestionnaireIds: ['phq2'],
    consentedStudyIds: []
  };
}

describe('ResearchHeaderWidget', () => {
  it('renders study title, batch of n, closing days, questionnaire count, and disclaimer, linking to /research', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchHeaderWidget />, { wrapper: createWrapper() });

    const widget = screen.getByTestId('research-header-widget');
    expect(widget.getAttribute('href')).toBe('/research');
    expect(screen.getByText('Konsulin Mental Health Survey')).toBeTruthy();
    expect(screen.getByText(/Batch 2 of 3/)).toBeTruthy();
    expect(screen.getByText(/Closes in \d+ days/)).toBeTruthy();
    expect(screen.getByText('1/3 Questionnaires')).toBeTruthy();
    expect(
      screen.getByText(/Every questionnaire you complete counts toward/i)
    ).toBeTruthy();
  });

  it('does not render the level badge or continue text', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchHeaderWidget />, { wrapper: createWrapper() });

    expect(screen.queryByText('Participant')).toBeNull();
    expect(screen.queryByText(/Continue/)).toBeNull();
  });

  it('renders nothing while the progress query is loading', () => {
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: true
    });

    render(<ResearchHeaderWidget />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('research-header-widget')).toBeNull();
  });

  it('renders nothing when no active study exists', () => {
    mockUseResearchProgress.mockReturnValue({
      data: { ...makeProgress(), studies: [] },
      isLoading: false
    });

    render(<ResearchHeaderWidget />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('research-header-widget')).toBeNull();
  });

  it('renders nothing when the study has no current batch', () => {
    mockUseResearchProgress.mockReturnValue({
      data: {
        ...makeProgress(),
        studies: [
          {
            ...makeProgress().studies[0],
            currentBatch: null,
            completedCount: 0,
            totalCount: 0
          }
        ]
      },
      isLoading: false
    });

    render(<ResearchHeaderWidget />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('research-header-widget')).toBeNull();
  });
});
