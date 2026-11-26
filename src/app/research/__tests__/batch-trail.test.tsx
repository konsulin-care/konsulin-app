import type { BatchHistoryEntry, ResearchBatch } from '@/utils/fhir/research';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BatchTrail from '../batch-trail';
import { makeStudyProgress } from './research-fixtures';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

const BATCHES: ResearchBatch[] = [
  {
    id: 'batch-1',
    start: '2026-01-01',
    end: '2026-01-31',
    questionnaireIds: ['phq2']
  },
  {
    id: 'batch-2',
    start: '2026-02-01',
    end: '2026-02-28',
    questionnaireIds: ['phq2']
  },
  {
    id: 'batch-3',
    start: '2026-03-01',
    end: '2026-03-31',
    questionnaireIds: ['phq2']
  },
  {
    id: 'batch-4',
    start: '2026-04-01',
    end: '2026-04-30',
    questionnaireIds: ['phq2']
  }
];

const HISTORY: BatchHistoryEntry[] = BATCHES.map(batch => ({
  batchId: batch.id,
  start: batch.start,
  end: batch.end,
  participated: batch.id === 'batch-1'
}));

const TODAY = '2026-03-15';

/** Renders the trail with the shared batch fixture. */
function renderTrail(
  overrides: Parameters<typeof makeStudyProgress>[0] = {},
  waitingBatchIds?: ReadonlySet<string>
) {
  render(
    <BatchTrail
      progress={makeStudyProgress({
        batches: BATCHES,
        currentBatch: BATCHES[2],
        history: HISTORY,
        ...overrides
      })}
      waitingBatchIds={waitingBatchIds}
      today={TODAY}
    />
  );
}

describe('BatchTrail', () => {
  it('derives done, missed, current and upcoming from dates and participation', () => {
    renderTrail();

    expect(screen.getByTestId('batch-chip-batch-1')).toHaveAttribute(
      'data-status',
      'done'
    );
    expect(screen.getByTestId('batch-chip-batch-2')).toHaveAttribute(
      'data-status',
      'missed'
    );
    expect(screen.getByTestId('batch-chip-batch-3')).toHaveAttribute(
      'data-status',
      'current'
    );
    expect(screen.getByTestId('batch-chip-batch-4')).toHaveAttribute(
      'data-status',
      'upcoming'
    );
  });

  it('marks the current batch done when progress is complete', () => {
    renderTrail({ isComplete: true });

    expect(screen.getByTestId('batch-chip-batch-3')).toHaveAttribute(
      'data-status',
      'done'
    );
  });

  it('marks a waiting batch syncing and keeps a done batch done', () => {
    renderTrail({}, new Set(['batch-1', 'batch-3']));

    expect(screen.getByTestId('batch-chip-batch-1')).toHaveAttribute(
      'data-status',
      'done'
    );
    const syncing = screen.getByTestId('batch-chip-batch-3');
    expect(syncing).toHaveAttribute('data-status', 'syncing');
    expect(syncing.className).toContain('border-dashed');
    expect(syncing.parentElement).toHaveTextContent('Waiting to sync');
  });

  it('shows a visible status label per node and one aria-label summary', () => {
    renderTrail();

    expect(
      screen.getByTestId('batch-chip-batch-1').parentElement
    ).toHaveTextContent('Done');
    expect(
      screen.getByTestId('batch-chip-batch-2').parentElement
    ).toHaveTextContent('Not joined');
    expect(
      screen.getByTestId('batch-chip-batch-3').parentElement
    ).toHaveTextContent('Current');
    expect(
      screen.getByTestId('batch-chip-batch-4').parentElement
    ).toHaveTextContent('Upcoming');

    expect(screen.getByRole('list')).toHaveAttribute(
      'aria-label',
      'Batch trail: Batch 1: Done, Batch 2: Not joined, Batch 3: Current, Batch 4: Upcoming'
    );
  });
});
