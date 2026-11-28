import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { setResearchTarget } from '@/utils/fhir/research-target';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ResearcherStudyCard from '../researcher-study-card';

const { mockUseStudyParticipantCount } = vi.hoisted(() => ({
  mockUseStudyParticipantCount: vi.fn()
}));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('@/services/api/research-counts', () => ({
  useStudyParticipantCount: (studyId?: string) =>
    mockUseStudyParticipantCount(studyId)
}));

/**
 * Builds a study with two batches and a participant target.
 *
 * @returns The researcher study fixture.
 */
function makeStudy(): ResearchStudyWithBatches {
  const batchOne = {
    id: 'batch-1',
    start: '2026-01-01',
    end: '2026-01-31',
    questionnaireIds: ['phq2']
  };
  const batchTwo = {
    id: 'batch-2',
    start: '2026-02-01',
    end: '2026-02-28',
    questionnaireIds: ['phq2']
  };
  return {
    study: setResearchTarget(
      {
        resourceType: 'ResearchStudy',
        id: 'study-1',
        status: 'active',
        title: 'Sleep and Mood',
        sponsor: { reference: 'Organization/sleep-lab', display: 'Sleep Lab' }
      },
      100
    ),
    batches: [batchOne, batchTwo],
    currentBatch: batchTwo,
    daysRemaining: 12
  };
}

describe('ResearcherStudyCard', () => {
  beforeEach(() => {
    mockUseStudyParticipantCount.mockReturnValue({
      data: 12,
      isLoading: false
    });
  });

  it('renders the status chip, one batch segment per batch and the participant progress', () => {
    render(<ResearcherStudyCard study={makeStudy()} today='2026-02-10' />);

    expect(screen.getByText('Sleep Lab')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Sleep and Mood' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('study-status-chip')).toBeInTheDocument();
    const segments = screen.getByTestId('batch-segments');
    expect(segments.querySelectorAll('[data-state]')).toHaveLength(2);
    expect(screen.getByText('12 of 100 participants')).toBeInTheDocument();
  });

  it('renders exactly one interactive element: a charcoal Manage study link', () => {
    const { container } = render(
      <ResearcherStudyCard study={makeStudy()} today='2026-02-10' />
    );

    const interactive = container.querySelectorAll('a, button');
    expect(interactive).toHaveLength(1);
    expect(interactive[0]).toHaveTextContent('Manage study');

    const link = screen.getByRole('link', { name: 'Manage study' });
    expect(link).toHaveAttribute('href', '/research/manage?id=study-1');
    expect(link).toHaveClass('bg-primary', 'text-primary-foreground');
    expect(link).toHaveClass('w-full', 'min-h-11');
  });

  it('does not render the raw study path, the study page link or a finding button', () => {
    render(<ResearcherStudyCard study={makeStudy()} today='2026-02-10' />);

    expect(screen.queryByText('/study?id=study-1')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'See the study page' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Post a finding' })
    ).not.toBeInTheDocument();
  });
});
