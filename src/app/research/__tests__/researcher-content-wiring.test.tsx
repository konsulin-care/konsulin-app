import { wrapper } from '@/__tests__/react-test-utils';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherContent from '../researcher-content';
import { makeStudyWithBatches } from './research-fixtures';

// Mock ResearcherCarousel
vi.mock('../researcher-carousel', () => ({
  default: ({ studies }: { studies: { study: { id: string } }[] }) => (
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
    studies: unknown[];
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

describe('ResearcherContent wiring', () => {
  it('renders ResearcherImpactDashboard when studies exist', () => {
    render(
      <ResearcherContent
        isLoading={false}
        studies={[makeStudyWithBatches('study-1')]}
        activeId='study-1'
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
        practitionerId='practitioner-1'
        activeStudyId='study-1'
      />,
      { wrapper }
    );
    expect(
      screen.getByTestId('researcher-impact-dashboard')
    ).toBeInTheDocument();
  });

  it('passes studies, activeStudyId, and practitionerId to dashboard', () => {
    render(
      <ResearcherContent
        isLoading={false}
        studies={[
          makeStudyWithBatches('study-1'),
          makeStudyWithBatches('study-2')
        ]}
        activeId='study-2'
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
        practitionerId='practitioner-1'
        activeStudyId='study-2'
      />,
      { wrapper }
    );
    const dashboard = screen.getByTestId('researcher-impact-dashboard');
    expect(dashboard).toHaveAttribute('data-studies', '2');
    expect(dashboard).toHaveAttribute('data-active', 'study-2');
    expect(dashboard).toHaveAttribute('data-practitioner', 'practitioner-1');
  });

  it('does not render dashboard when loading', () => {
    render(
      <ResearcherContent
        isLoading
        studies={[]}
        activeId=''
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
        practitionerId='practitioner-1'
        activeStudyId=''
      />,
      { wrapper }
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
      { wrapper }
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(
      screen.queryByTestId('researcher-impact-dashboard')
    ).not.toBeInTheDocument();
  });
});
