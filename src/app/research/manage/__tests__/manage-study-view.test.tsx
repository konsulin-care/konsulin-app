import type { ResearchStudyWithBatches } from '@/services/api/researcher';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManageStudyView from '../manage-study-view';

const { mockUseStudyParticipantCount, mockUsePostFinding } = vi.hoisted(() => ({
  mockUseStudyParticipantCount: vi.fn(),
  mockUsePostFinding: vi.fn()
}));

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('@/services/api/research-counts', () => ({
  useStudyParticipantCount: () => mockUseStudyParticipantCount()
}));

vi.mock('@/services/api/research-findings', () => {
  class StudyConflictError extends Error {}
  return {
    StudyConflictError,
    usePostFinding: () => mockUsePostFinding()
  };
});

const TODAY = '2026-02-10';

/**
 * Builds a study fixture with the given batches.
 *
 * @param batches - Batch windows of the study.
 * @returns The study fixture.
 */
function makeStudy(
  batches: ResearchStudyWithBatches['batches']
): ResearchStudyWithBatches {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id: 'study-1',
      status: 'active',
      title: 'Sleep and Mood',
      sponsor: { display: 'Konsulin Lab' }
    },
    batches,
    currentBatch: null,
    daysRemaining: 0
  };
}

/** Study whose only batch closed without a posted finding. */
const FINDING_DUE = makeStudy([
  {
    id: 'batch-1',
    start: '2026-01-01',
    end: '2026-01-31',
    questionnaireIds: []
  }
]);

/** Study with a batch currently running, so no finding is due. */
const OPEN = makeStudy([
  {
    id: 'batch-1',
    start: '2026-02-01',
    end: '2026-02-28',
    questionnaireIds: []
  }
]);

/**
 * Counts the buttons rendered with the turquoise action variant.
 *
 * @returns The number of action-variant buttons.
 */
function countActionButtons(): number {
  return screen
    .queryAllByRole('button')
    .filter(button => button.classList.contains('bg-secondary')).length;
}

/**
 * Reads the test id of the card that directly follows the overview card in DOM
 * order.
 *
 * @returns The next card's test id, or null when there is no next card.
 */
function cardAfterOverview(): string | null {
  const overview = screen.getByTestId('overview-card');
  const next = overview.parentElement?.nextElementSibling;
  const card = next?.querySelector('[data-testid$="-card"]');
  return card?.getAttribute('data-testid') ?? null;
}

describe('ManageStudyView', () => {
  beforeEach(() => {
    mockUseStudyParticipantCount.mockReturnValue({
      data: 12,
      isLoading: false
    });
    mockUsePostFinding.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null
    });
  });

  it('renders the back link, sponsor, title and status chip', () => {
    render(<ManageStudyView study={FINDING_DUE} today={TODAY} />);

    expect(screen.getByRole('link', { name: 'Your studies' })).toHaveAttribute(
      'href',
      '/'
    );
    expect(screen.getByText('Konsulin Lab')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sleep and Mood' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('study-status-chip')).toHaveAttribute(
      'data-status',
      'finding-due'
    );
  });

  it('renders Post to participants as the only action when a finding is due', () => {
    render(<ManageStudyView study={FINDING_DUE} today={TODAY} />);

    expect(countActionButtons()).toBe(1);
    const button = screen.getByRole('button', {
      name: 'Post to participants'
    });
    expect(button).toHaveClass('bg-secondary');
  });

  it('renders Copy link as the only action otherwise', () => {
    render(<ManageStudyView study={OPEN} today={TODAY} />);

    expect(countActionButtons()).toBe(1);
    const button = screen.getByRole('button', { name: 'Copy link' });
    expect(button).toHaveClass('bg-secondary');
  });

  it('places the finding card directly after overview when a finding is due', () => {
    render(<ManageStudyView study={FINDING_DUE} today={TODAY} />);

    expect(cardAfterOverview()).toBe('findings-card');
  });

  it('places the share card directly after overview otherwise', () => {
    render(<ManageStudyView study={OPEN} today={TODAY} />);

    expect(cardAfterOverview()).toBe('share-card');
  });
});
