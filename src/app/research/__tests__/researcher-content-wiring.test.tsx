import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherContent from '../researcher-content';

// Mock ResearcherCarousel
vi.mock('../researcher-carousel', () => ({
  default: ({ studies }: { studies: ResearchStudyWithBatches[] }) => (
    <div data-testid='researcher-carousel'>
      {studies.map(s => (
        <div key={s.study.id} data-testid={`mock-slide-${s.study.id}`} />
      ))}
    </div>
  )
}));

// Mock ResearcherImpactDashboard
vi.mock('../researcher-impact-dashboard', () => ({
  default: ({
    studies,
    activeStudyId,
    practitionerId
  }: {
    studies: ResearchStudyWithBatches[];
    activeStudyId: string;
    practitionerId?: string;
  }) => (
    <div
      data-testid='researcher-impact-dashboard'
      data-studies={studies.length}
      data-active={activeStudyId}
      data-practitioner={practitionerId}
    />
  )
}));

// Mock EmptyState
vi.mock('@/components/general/empty-state', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid='empty-state'>{title}</div>
  )
}));

// Mock ResearchSkeleton
vi.mock('./research-skeleton', () => ({
  default: () => <div data-testid='research-skeleton' />
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

function makeStudy(id: string): ResearchStudyWithBatches {
  return {
    study: {
      resourceType: 'ResearchStudy' as const,
      id,
      title: `Study ${id}`,
      status: 'active' as const
    },
    batches: [
      {
        id: `${id}-batch-0`,
        start: '2026-01-01',
        end: '2026-12-31',
        questionnaireIds: ['q-1']
      }
    ],
    currentBatch: {
      id: `${id}-batch-0`,
      start: '2026-01-01',
      end: '2026-12-31',
      questionnaireIds: ['q-1']
    },
    daysRemaining: 30
  };
}

describe('ResearcherContent wiring', () => {
  it('renders ResearcherImpactDashboard when studies exist', () => {
    render(
      <ResearcherContent
        isLoading={false}
        studies={[makeStudy('study-1')]}
        activeId='study-1'
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
        practitionerId='practitioner-1'
        activeStudyId='study-1'
      />,
      { wrapper: createWrapper() }
    );
    expect(
      screen.getByTestId('researcher-impact-dashboard')
    ).toBeInTheDocument();
  });

  it('passes studies, activeStudyId, and practitionerId to dashboard', () => {
    render(
      <ResearcherContent
        isLoading={false}
        studies={[makeStudy('study-1'), makeStudy('study-2')]}
        activeId='study-2'
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
        practitionerId='practitioner-1'
        activeStudyId='study-2'
      />,
      { wrapper: createWrapper() }
    );
    const dashboard = screen.getByTestId('researcher-impact-dashboard');
    expect(dashboard).toHaveAttribute('data-studies', '2');
    expect(dashboard).toHaveAttribute('data-active', 'study-2');
    expect(dashboard).toHaveAttribute('data-practitioner', 'practitioner-1');
  });

  it('does not render dashboard when loading', () => {
    render(
      <ResearcherContent
        isLoading={true}
        studies={[]}
        activeId=''
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
        practitionerId='practitioner-1'
        activeStudyId=''
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByTestId('research-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByTestId('researcher-impact-dashboard')
    ).not.toBeInTheDocument();
  });

  it('does not render dashboard when no studies', () => {
    render(
      <ResearcherContent
        isLoading={false}
        studies={[]}
        activeId=''
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
        practitionerId='practitioner-1'
        activeStudyId=''
      />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(
      screen.queryByTestId('researcher-impact-dashboard')
    ).not.toBeInTheDocument();
  });
});
