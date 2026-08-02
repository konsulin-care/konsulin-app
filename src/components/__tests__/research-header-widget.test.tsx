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

describe('ResearchHeaderWidget', () => {
  it('renders the current batch progress and level, linking to /research', () => {
    mockUseResearchProgress.mockReturnValue({
      data: makeProgress(),
      isLoading: false
    });

    render(<ResearchHeaderWidget />, { wrapper: createWrapper() });

    const widget = screen.getByTestId('research-header-widget');
    expect(widget.getAttribute('href')).toBe('/research');
    expect(screen.getByText('Active Research')).toBeTruthy();
    expect(screen.getByText(/Batch 1 · 1\/2 questionnaires/)).toBeTruthy();
    expect(screen.getByText('Participant')).toBeTruthy();
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
