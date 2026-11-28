import type { ResearchBatch } from '@/utils/fhir/research';
import { formatBatchDate } from '@/utils/format-batch-date';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BatchSegments } from '../batch-segments';
import { StudyStatusChip } from '../study-status-chip';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

/**
 * Builds a batch fixture.
 *
 * @param id - Batch id.
 * @param start - Batch start date.
 * @param end - Batch end date.
 * @returns The batch fixture.
 */
function makeBatch(id: string, start: string, end: string): ResearchBatch {
  return { id, start, end, questionnaireIds: ['phq2'] };
}

describe('StudyStatusChip', () => {
  it('shows Finding due for a finding-due status', () => {
    render(<StudyStatusChip status={{ kind: 'finding-due', batchIndex: 0 }} />);

    const chip = screen.getByTestId('study-status-chip');
    expect(chip).toHaveAttribute('data-status', 'finding-due');
    expect(chip).toHaveTextContent('Finding due');
    expect(chip).toHaveClass('bg-accent', 'text-foreground');
  });

  it('shows the closing date for an open status', () => {
    render(
      <StudyStatusChip status={{ kind: 'open', closesOn: '2026-02-28' }} />
    );

    expect(screen.getByTestId('study-status-chip')).toHaveTextContent(
      `Open · closes ${formatBatchDate('2026-02-28', 'id')}`
    );
    expect(screen.getByTestId('study-status-chip')).toHaveClass(
      'bg-muted',
      'text-charcoal-700'
    );
  });

  it('shows the opening date for an upcoming status', () => {
    render(
      <StudyStatusChip status={{ kind: 'upcoming', opensOn: '2026-03-01' }} />
    );

    expect(screen.getByTestId('study-status-chip')).toHaveTextContent(
      `Opens ${formatBatchDate('2026-03-01', 'id')}`
    );
  });

  it('shows Finished for a finished status', () => {
    render(<StudyStatusChip status={{ kind: 'finished' }} />);

    expect(screen.getByTestId('study-status-chip')).toHaveTextContent(
      'Finished'
    );
  });
});

describe('BatchSegments', () => {
  it('renders one segment per batch with closed, current and upcoming states', () => {
    const batches = [
      makeBatch('closed', '2026-01-01', '2026-01-31'),
      makeBatch('current', '2026-02-01', '2026-02-28'),
      makeBatch('upcoming', '2026-03-01', '2026-03-31')
    ];

    const { container } = render(
      <BatchSegments batches={batches} today='2026-02-10' />
    );

    const segments = container.querySelectorAll('[data-state]');
    expect(segments).toHaveLength(3);
    expect(segments[0]).toHaveAttribute('data-state', 'closed');
    expect(segments[1]).toHaveAttribute('data-state', 'current');
    expect(segments[2]).toHaveAttribute('data-state', 'upcoming');
    expect(segments[1]).toHaveClass('bg-turquoise-deep');
    expect(segments[0]).toHaveClass('bg-charcoal-400');
    expect(segments[2]).toHaveClass('bg-charcoal-200');
    expect(screen.getByTestId('batch-segments')).toHaveAttribute(
      'aria-label',
      'Batch 2 of 3'
    );
  });

  it('labels with the last closed batch when nothing is running', () => {
    const batches = [
      makeBatch('one', '2026-01-01', '2026-01-31'),
      makeBatch('two', '2026-02-01', '2026-02-28')
    ];

    render(<BatchSegments batches={batches} today='2026-03-10' />);

    expect(screen.getByTestId('batch-segments')).toHaveAttribute(
      'aria-label',
      'Batch 2 of 2'
    );
  });
});
