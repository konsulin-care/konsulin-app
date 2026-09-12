import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ResearcherStudySlide from '../researcher-study-slide';

const mockStudy: ResearchStudyWithBatches = {
  study: {
    resourceType: 'ResearchStudy',
    id: 'study-1',
    title: 'Mental Health Survey',
    status: 'active',
    description: 'A comprehensive study about mental health'
  },
  batches: [
    {
      id: 'batch-1',
      start: '2026-01-01',
      end: '2026-12-31',
      questionnaireIds: ['phq2', 'phq9', 'gad7']
    },
    {
      id: 'batch-2',
      start: '2026-01-01',
      end: '2026-12-31',
      questionnaireIds: ['phq2']
    }
  ],
  currentBatch: {
    id: 'batch-1',
    start: '2026-01-01',
    end: '2026-12-31',
    questionnaireIds: ['phq2', 'phq9', 'gad7']
  },
  daysRemaining: 5
};

describe('ResearcherStudySlide', () => {
  it('renders study title and status badge', () => {
    render(
      <ResearcherStudySlide
        study={mockStudy}
        isActive={true}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Mental Health Survey')).toBeInTheDocument();
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('renders truncated description', () => {
    render(
      <ResearcherStudySlide
        study={mockStudy}
        isActive={true}
        onClick={vi.fn()}
      />
    );

    expect(
      screen.getByText('A comprehensive study about mental health')
    ).toBeInTheDocument();
  });

  it('renders batch count and days remaining', () => {
    render(
      <ResearcherStudySlide
        study={mockStudy}
        isActive={true}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText(/2 batches/)).toBeInTheDocument();
    expect(screen.getByText(/Batch closes in 5 days/)).toBeInTheDocument();
  });

  it('renders questionnaire count', () => {
    render(
      <ResearcherStudySlide
        study={mockStudy}
        isActive={true}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('3 questionnaires')).toBeInTheDocument();
  });

  it('applies active/inactive opacity based on isActive prop', () => {
    const { rerender } = render(
      <ResearcherStudySlide
        study={mockStudy}
        isActive={true}
        onClick={vi.fn()}
      />
    );

    const card = screen.getByTestId('researcher-slide-study-1');
    expect(card.className).toContain('opacity-100');

    rerender(
      <ResearcherStudySlide
        study={mockStudy}
        isActive={false}
        onClick={vi.fn()}
      />
    );

    expect(card.className).toContain('opacity-70');
  });

  it('calls onClick with study id when card is clicked', () => {
    const onClick = vi.fn();
    render(
      <ResearcherStudySlide
        study={mockStudy}
        isActive={true}
        onClick={onClick}
      />
    );

    const button = screen.getByRole('button', {
      name: /open study mental health survey/i
    });
    button.click();

    expect(onClick).toHaveBeenCalledWith('study-1');
  });

  it('displays participantCount prop instead of hardcoded value', () => {
    render(
      <ResearcherStudySlide
        study={mockStudy}
        isActive={true}
        onClick={vi.fn()}
        participantCount={7}
      />
    );

    expect(screen.getByText('7 participants')).toBeInTheDocument();
    expect(screen.queryByText('12 participants')).not.toBeInTheDocument();
  });

  it('shows dash when participantCount is undefined', () => {
    render(
      <ResearcherStudySlide
        study={mockStudy}
        isActive={true}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText(/— participants/)).toBeInTheDocument();
  });
});
