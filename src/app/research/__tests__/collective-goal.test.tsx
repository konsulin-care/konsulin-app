import { setResearchTarget } from '@/utils/fhir/research-target';
import { render, screen } from '@testing-library/react';
import type { ResearchStudy } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CollectiveGoal } from '../collective-goal';
import { makeStudyProgress } from './research-fixtures';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const { mockUseStudyParticipantCount } = vi.hoisted(() => ({
  mockUseStudyParticipantCount:
    vi.fn<
      (
        studyId: string | undefined,
        options?: { enabled?: boolean }
      ) => { data?: number; isError: boolean }
    >()
}));

vi.mock('@/services/api/research-counts', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/services/api/research-counts')>();
  return {
    ...actual,
    useStudyParticipantCount: mockUseStudyParticipantCount
  };
});

const STUDY = makeStudyProgress().study;

/**
 * Renders the collective goal with the supplied query result and flags.
 *
 * @param result - Query result returned by the mocked participant count hook.
 * @param flags - Guest and consent status overrides.
 */
function renderGoal(
  result: { data?: number; isError: boolean },
  flags: { isGuest?: boolean; isConsented?: boolean } = {},
  study: ResearchStudy = STUDY
) {
  mockUseStudyParticipantCount.mockReturnValue(result);
  render(
    <CollectiveGoal
      study={study}
      isGuest={flags.isGuest ?? false}
      isConsented={flags.isConsented ?? false}
    />
  );
}

beforeEach(() => {
  mockUseStudyParticipantCount.mockReset();
});

describe('CollectiveGoal', () => {
  it('disables the count and hides the goal for guests', () => {
    renderGoal({ data: 7, isError: false }, { isGuest: true });

    expect(mockUseStudyParticipantCount).toHaveBeenCalledWith(STUDY.id, {
      enabled: false
    });
    expect(screen.queryByTestId('collective-goal')).toBeNull();
  });

  it('renders nothing for a failed guest count', () => {
    renderGoal({ data: undefined, isError: true }, { isGuest: true });

    expect(mockUseStudyParticipantCount).toHaveBeenCalledWith(STUDY.id, {
      enabled: false
    });
    expect(screen.queryByTestId('collective-goal')).toBeNull();
  });

  it('hides the just-started invitation for a guest below the floor', () => {
    renderGoal({ data: 3, isError: false }, { isGuest: true });

    expect(screen.queryByTestId('collective-goal')).toBeNull();
    expect(
      screen.queryByText('This study has just started. Be one of the first.')
    ).toBeNull();
  });

  it('renders nothing while the count is loading', () => {
    renderGoal({ data: undefined, isError: false });

    expect(screen.queryByTestId('collective-goal')).toBeNull();
  });

  it('renders nothing when the count query errors', () => {
    renderGoal({ data: undefined, isError: true });

    expect(screen.queryByTestId('collective-goal')).toBeNull();
  });

  it('shows only the just-started line below the floor', () => {
    renderGoal({ data: 3, isError: false });

    expect(screen.getByTestId('collective-goal')).toHaveTextContent(
      'This study has just started. Be one of the first.'
    );
    expect(
      screen.getByTestId('collective-goal').querySelector('button')
    ).toBeNull();
    expect(screen.queryByText(/^\d+ people have joined\.$/)).toBeNull();
  });

  it('applies the floor to others for a consented participant', () => {
    renderGoal({ data: 5, isError: false }, { isConsented: true });

    expect(screen.getByTestId('collective-goal')).toHaveTextContent(
      'This study has just started. Be one of the first.'
    );
    expect(screen.queryByText(/You and/)).toBeNull();
  });

  it('shows the others count with the cached-count info for a consented participant', () => {
    renderGoal({ data: 10, isError: false }, { isConsented: true });

    expect(screen.getByTestId('collective-goal')).toHaveTextContent(
      'You and 9 others have joined.'
    );
    expect(
      screen.getByRole('button', { name: 'About this count' })
    ).toBeInTheDocument();
  });

  it('shows the total count with the cached-count info for other participants', () => {
    renderGoal({ data: 7, isError: false });

    expect(screen.getByTestId('collective-goal')).toHaveTextContent(
      '7 people have joined.'
    );
    expect(
      screen.getByRole('button', { name: 'About this count' })
    ).toBeInTheDocument();
  });

  it('renders the target bar and ticks at or above the floor', () => {
    renderGoal({ data: 7, isError: false }, {}, setResearchTarget(STUDY, 100));

    const bar = screen.getByRole('progressbar', {
      name: 'Participant goal'
    });
    expect(bar.className).toContain('bg-muted');
    expect(bar.querySelector('.bg-turquoise-deep')).not.toBeNull();
    expect(screen.getAllByTestId('goal-tick')).toHaveLength(3);
    expect(screen.getByText('7 of 100')).toBeInTheDocument();
  });

  it('shows the remaining sentence only when the target exceeds the count', () => {
    renderGoal({ data: 7, isError: false }, {}, setResearchTarget(STUDY, 10));

    expect(screen.getByText('Together, we need 3 more.')).toBeInTheDocument();
  });

  it('hides the remaining sentence when the target is reached', () => {
    renderGoal({ data: 10, isError: false }, {}, setResearchTarget(STUDY, 10));

    expect(screen.queryByText(/Together, we need/)).toBeNull();
  });

  it('renders neither bar nor remaining sentence without a target', () => {
    renderGoal({ data: 7, isError: false });

    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByTestId('goal-tick')).toBeNull();
    expect(screen.queryByText(/Together, we need/)).toBeNull();
  });

  it('keeps the bar hidden below the floor even when a target exists', () => {
    renderGoal({ data: 3, isError: false }, {}, setResearchTarget(STUDY, 100));

    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText(/Together, we need/)).toBeNull();
  });
});
