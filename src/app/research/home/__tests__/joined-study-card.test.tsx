import type { ResearchBatch, StudyProgress } from '@/utils/fhir/research';
import { formatBatchDate } from '@/utils/format-batch-date';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import JoinedStudyCard, {
  type JoinedStudyCardProps
} from '../joined-study-card';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const BATCHES: ResearchBatch[] = [
  {
    id: 'batch-1',
    start: '2026-06-01',
    end: '2026-06-30',
    questionnaireIds: ['phq2']
  },
  {
    id: 'batch-2',
    start: '2026-07-01',
    end: '2026-07-31',
    questionnaireIds: ['phq2', 'big-five-inventory']
  },
  {
    id: 'batch-3',
    start: '2026-08-01',
    end: '2026-08-31',
    questionnaireIds: ['phq2']
  }
];

/**
 * Builds a joined study progress fixture.
 *
 * @param overrides - Progress overrides.
 * @returns The study progress fixture.
 */
function makeProgress(overrides: Partial<StudyProgress> = {}): StudyProgress {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id: 'research',
      status: 'active',
      title: 'Konsulin Mental Health Survey',
      sponsor: { display: 'Konsulin Research Lab' },
      principalInvestigator: { display: 'Dr. Ada' }
    },
    batches: BATCHES,
    currentBatch: BATCHES[1],
    completedCount: 1,
    totalCount: 2,
    isComplete: false,
    firstUncompletedQuestionnaireId: 'big-five-inventory',
    completedQuestionnaireIds: ['phq2'],
    history: [],
    ...overrides
  };
}

/**
 * Renders the joined study card with defaults for the option under test.
 *
 * @param overrides - Prop overrides.
 * @returns The render result.
 */
function renderCard(overrides: Partial<JoinedStudyCardProps> = {}) {
  return render(
    <JoinedStudyCard
      progress={makeProgress()}
      today='2026-07-15'
      {...overrides}
    />
  );
}

describe('JoinedStudyCard', () => {
  it('shows the title, group and lead and exactly one status chip', () => {
    renderCard();

    expect(
      screen.getByText('Konsulin Mental Health Survey')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Konsulin Research Lab · led by Dr. Ada')
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('joined-card-status')).toHaveLength(1);
    expect(screen.getByTestId('joined-card-status')).toHaveTextContent(
      'Needs you'
    );
  });

  it('shows the batch line and shared progress for the current batch', () => {
    renderCard();

    expect(screen.getByText('Batch 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 shared in this batch')).toBeInTheDocument();
    expect(screen.getByTestId('joined-card-status')).toHaveTextContent(
      'Needs you'
    );
  });

  it('shows a one-time study line when the study has a single batch', () => {
    const batch = BATCHES[0];
    renderCard({
      progress: makeProgress({
        batches: [batch],
        currentBatch: batch,
        completedCount: 0,
        totalCount: 1,
        isComplete: false,
        completedQuestionnaireIds: []
      })
    });

    expect(screen.getByText('One-time study')).toBeInTheDocument();
    expect(screen.getByText('0 of 1 shared in this batch')).toBeInTheDocument();
  });

  it('shows the next batch opening date when no batch is open', () => {
    renderCard({
      progress: makeProgress({ currentBatch: null, completedCount: 0 })
    });

    expect(
      screen.getByText(
        `Next batch opens ${formatBatchDate('2026-08-01', 'id')}`
      )
    ).toBeInTheDocument();
    expect(screen.queryByTestId('joined-card-progress')).toBeNull();
  });

  it('links to the study and only to the report once the batch is complete', () => {
    renderCard();

    expect(screen.getByRole('link', { name: 'Open study' })).toHaveAttribute(
      'href',
      '/study?id=research'
    );
    expect(screen.queryByRole('link', { name: 'See your report' })).toBeNull();
  });

  it('shows the report link and shared status when the current batch is complete', () => {
    renderCard({
      progress: makeProgress({
        completedCount: 2,
        isComplete: true,
        completedQuestionnaireIds: ['phq2', 'big-five-inventory']
      })
    });

    expect(
      screen.getByRole('link', { name: 'See your report' })
    ).toHaveAttribute('href', '/report?id=research');
    expect(screen.getByTestId('joined-card-status')).toHaveTextContent(
      'Shared this batch'
    );
  });
});
