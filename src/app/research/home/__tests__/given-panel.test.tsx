import { render, screen } from '@testing-library/react';
import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import GivenPanel, { type GivenPanelProps } from '../given-panel';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

vi.mock('@/app/research/collective-goal', () => ({
  CollectiveGoal: ({
    study,
    isGuest
  }: {
    study: ResearchStudy;
    isGuest: boolean;
  }) => (
    <div
      data-testid='collective-goal'
      data-study={study.id}
      data-guest={String(isGuest)}
    />
  )
}));

const UP_NEXT_STUDY: ResearchStudy = {
  resourceType: 'ResearchStudy',
  id: 'up-next-study',
  status: 'active',
  title: 'Up next study'
};

/**
 * Renders the given panel with defaults for the option under test.
 *
 * @param overrides - Prop overrides.
 * @returns The render result.
 */
function renderPanel(overrides: Partial<GivenPanelProps> = {}) {
  return render(
    <GivenPanel
      totals={{ questionnairesShared: 4, minutes: 32, studies: 2 }}
      upNextStudy={UP_NEXT_STUDY}
      isGuest={false}
      {...overrides}
    />
  );
}

describe('GivenPanel', () => {
  it('shows questionnaires shared, minutes and studies from the totals', () => {
    renderPanel();

    expect(screen.getByText('What you have given')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('questionnaires shared')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('minutes of your time')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('studies it counts toward')).toBeInTheDocument();
  });

  it('shows the collective count for the up-next study to patients', () => {
    renderPanel();

    expect(screen.getByTestId('collective-goal')).toHaveAttribute(
      'data-study',
      'up-next-study'
    );
    expect(screen.getByTestId('collective-goal')).toHaveAttribute(
      'data-guest',
      'false'
    );
  });

  it('shows no collective count to guests', () => {
    renderPanel({ isGuest: true });

    expect(screen.queryByTestId('collective-goal')).toBeNull();
    expect(screen.getByText('What you have given')).toBeInTheDocument();
  });
});
