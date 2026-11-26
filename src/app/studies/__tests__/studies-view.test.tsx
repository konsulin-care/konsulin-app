import type { StudyProgress } from '@/utils/fhir/research';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import StudiesView from '../studies-view';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

/**
 * Builds a catalogue study fixture with one open batch.
 *
 * @param index - Position used for the id and title.
 * @param other - True for a study from another research group.
 * @returns The study progress fixture.
 */
function makeStudy(index: number, other = false): StudyProgress {
  const batch = {
    id: `study-${index}-batch-1`,
    start: '2026-08-01',
    end: '2026-08-31',
    questionnaireIds: ['phq2']
  };
  return {
    study: {
      resourceType: 'ResearchStudy',
      id: `study-${index}`,
      status: 'active',
      title: `Study ${index}`,
      ...(other
        ? {
            sponsor: { display: 'University Lab', reference: 'Organization/u' }
          }
        : {})
    },
    batches: [batch],
    currentBatch: batch,
    completedCount: 0,
    totalCount: 1,
    isComplete: false,
    firstUncompletedQuestionnaireId: 'phq2',
    completedQuestionnaireIds: [],
    history: []
  };
}

const STUDIES: StudyProgress[] = [
  ...Array.from({ length: 15 }, (_, index) => makeStudy(index + 1)),
  ...Array.from({ length: 5 }, (_, index) => makeStudy(index + 16, true))
];

describe('StudiesView', () => {
  it('shows the count line and twelve rows before Show more', async () => {
    const user = userEvent.setup();
    render(<StudiesView studies={STUDIES} />);

    expect(
      screen.getByText(
        '12 of 20 studies. Konsulin studies come first, then the ones closing soonest.'
      )
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('studies-row')).toHaveLength(12);
    expect(
      screen.getByRole('heading', { name: 'All studies' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show more' }));

    expect(screen.getAllByTestId('studies-row')).toHaveLength(20);
    expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  });

  it('uses pressed filter buttons that narrow the list', async () => {
    const user = userEvent.setup();
    render(<StudiesView studies={STUDIES} />);

    const other = screen.getByRole('button', { name: 'Other groups' });
    expect(other).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'One-time' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    await user.click(other);

    expect(other).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('studies-row')).toHaveLength(5);
    expect(
      screen.getByText(
        '5 of 20 studies. Konsulin studies come first, then the ones closing soonest.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Study 1')).toBeNull();
    expect(screen.getByText('Study 16')).toBeInTheDocument();
  });

  it('links each row to its study page', () => {
    render(<StudiesView studies={[makeStudy(1)]} />);

    expect(screen.getByRole('link', { name: /Study 1/ })).toHaveAttribute(
      'href',
      '/study?id=study-1'
    );
  });

  it('shows the exact no-match text for a search without a match', async () => {
    const user = userEvent.setup();
    render(<StudiesView studies={STUDIES} />);

    await user.type(
      screen.getByPlaceholderText('Search by title, question or group'),
      'zzzz'
    );

    expect(
      screen.getByText(
        'No study matches. Try a shorter search or clear a filter.'
      )
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId('studies-row')).toHaveLength(0);
  });
});
