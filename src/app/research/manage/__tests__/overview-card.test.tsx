import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { setResearchTarget } from '@/utils/fhir/research-target';
import { formatBatchDate } from '@/utils/format-batch-date';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OverviewCard from '../overview-card';

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

const TODAY = '2026-02-10';

/**
 * Builds a study with a closed, an open and an upcoming batch plus a target.
 *
 * @returns The study fixture.
 */
function makeStudy(): ResearchStudyWithBatches {
  const closed = {
    id: 'batch-1',
    start: '2026-01-01',
    end: '2026-01-31',
    questionnaireIds: ['phq2']
  };
  const open = {
    id: 'batch-2',
    start: '2026-02-01',
    end: '2026-02-28',
    questionnaireIds: ['phq2']
  };
  const upcoming = {
    id: 'batch-3',
    start: '2026-03-01',
    end: '2026-03-31',
    questionnaireIds: ['phq2']
  };
  return {
    study: setResearchTarget(
      {
        resourceType: 'ResearchStudy',
        id: 'study-1',
        status: 'active',
        title: 'Sleep and Mood'
      },
      100
    ),
    batches: [closed, open, upcoming],
    currentBatch: open,
    daysRemaining: 18
  };
}

describe('OverviewCard', () => {
  beforeEach(() => {
    mockUseStudyParticipantCount.mockReturnValue({
      data: 12,
      isLoading: false
    });
  });

  it('renders the participant progress for the study', () => {
    const study = makeStudy();

    render(<OverviewCard study={study} today={TODAY} />);

    expect(mockUseStudyParticipantCount).toHaveBeenCalledWith('study-1');
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByTestId('participant-progress')).toHaveTextContent(
      '12 of 100 participants'
    );
    expect(screen.getByTestId('overview-card')).toHaveClass(
      'border-border',
      'bg-card',
      'rounded-lg',
      'border',
      'p-4'
    );
  });

  it('lists every batch with its formatted range and state label', () => {
    const study = makeStudy();

    render(<OverviewCard study={study} today={TODAY} />);

    const rows = screen.getAllByTestId('overview-batch');
    expect(rows).toHaveLength(3);

    expect(rows[0]).toHaveAttribute('data-batch-id', 'batch-1');
    expect(rows[0]).toHaveTextContent('Batch 1');
    expect(rows[0]).toHaveTextContent(
      `${formatBatchDate('2026-01-01', 'id')} – ${formatBatchDate('2026-01-31', 'id')}`
    );
    expect(rows[0]).toHaveTextContent('Closed');

    expect(rows[1]).toHaveTextContent('Batch 2');
    expect(rows[1]).toHaveTextContent(
      `${formatBatchDate('2026-02-01', 'id')} – ${formatBatchDate('2026-02-28', 'id')}`
    );
    expect(rows[1]).toHaveTextContent('Open');

    expect(rows[2]).toHaveTextContent('Batch 3');
    expect(rows[2]).toHaveTextContent('Upcoming');
  });

  it('renders no button', () => {
    render(<OverviewCard study={makeStudy()} today={TODAY} />);

    const card = screen.getByTestId('overview-card');
    expect(within(card).queryAllByRole('button')).toHaveLength(0);
    expect(within(card).queryAllByRole('link')).toHaveLength(0);
  });
});
