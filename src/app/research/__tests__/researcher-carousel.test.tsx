import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherCarousel from '../researcher-carousel';

const mockStudies: ResearchStudyWithBatches[] = [
  {
    study: {
      resourceType: 'ResearchStudy',
      id: 'study-1',
      title: 'Mental Health Survey',
      status: 'active',
      description: 'A study about mental health'
    },
    batches: [
      {
        id: 'batch-1',
        start: '2026-01-01',
        end: '2026-12-31',
        questionnaireIds: ['phq2']
      }
    ],
    currentBatch: {
      id: 'batch-1',
      start: '2026-01-01',
      end: '2026-12-31',
      questionnaireIds: ['phq2']
    },
    daysRemaining: 100
  },
  {
    study: {
      resourceType: 'ResearchStudy',
      id: 'study-2',
      title: 'Anxiety Research',
      status: 'completed',
      description: 'Research on anxiety disorders'
    },
    batches: [],
    currentBatch: null,
    daysRemaining: 0
  }
];

describe('ResearcherCarousel', () => {
  it('renders all study cards', () => {
    render(
      <ResearcherCarousel
        studies={mockStudies}
        activeId='study-1'
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
      />
    );

    expect(screen.getByText('Mental Health Survey')).toBeInTheDocument();
    expect(screen.getByText('Anxiety Research')).toBeInTheDocument();
  });

  it('renders dot indicators for each study', () => {
    render(
      <ResearcherCarousel
        studies={mockStudies}
        activeId='study-1'
        onSlideChange={vi.fn()}
        onStudyClick={vi.fn()}
      />
    );

    const dots = screen.getAllByRole('button', { name: /go to slide/i });
    expect(dots).toHaveLength(2);
  });

  it('calls onStudyClick when study card is clicked', () => {
    const onStudyClick = vi.fn();
    render(
      <ResearcherCarousel
        studies={mockStudies}
        activeId='study-1'
        onSlideChange={vi.fn()}
        onStudyClick={onStudyClick}
      />
    );

    const button = screen.getByRole('button', {
      name: /open study mental health survey/i
    });
    fireEvent.click(button);

    expect(onStudyClick).toHaveBeenCalledWith('study-1');
  });
});
