import type { QuestionnaireInfo } from '@/services/api/research';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BatchProgress,
  buildOverlapMap,
  QuestionnaireList,
  TimelineStrip
} from '../study-sections';
import { BATCH_1, makeStudyB, makeStudyProgress } from './research-fixtures';

/** Upcoming batch fixture sharing the same questionnaire set. */
function makeUpcomingBatch(id: string, start: string, end: string) {
  return { id, start, end, questionnaireIds: ['phq2'] };
}

afterEach(() => {
  vi.useRealTimers();
});

const TITLE_MAP: ReadonlyMap<string, QuestionnaireInfo> = new Map([
  ['phq2', { title: 'PHQ-2', durationMinutes: 8 }],
  ['big-five-inventory', { title: 'Big Five Inventory', durationMinutes: 15 }]
]);

/** Renders the list for the base study, which overlaps study-b on phq2. */
function renderList(
  props: {
    titleMap?: ReadonlyMap<string, QuestionnaireInfo>;
    isTitlesLoading?: boolean;
    showOverlapHints?: boolean;
    roleName?: string;
    completionCounts?: Map<string, number>;
  } = {}
) {
  const progress = makeStudyProgress();
  const overlapMap = buildOverlapMap([progress, makeStudyB()]);
  render(
    <QuestionnaireList
      progress={progress}
      overlapMap={overlapMap}
      onQuestionnaireClick={vi.fn()}
      {...props}
    />
  );
}

describe('BatchProgress', () => {
  it('labels a completed batch with the completed suffix and no green badge', () => {
    render(
      <BatchProgress
        progress={makeStudyProgress({
          completedCount: 2,
          isComplete: true,
          firstUncompletedQuestionnaireId: null,
          completedQuestionnaireIds: ['phq2', 'big-five-inventory']
        })}
      />
    );

    expect(screen.getByText('Batch 1 completed')).toBeTruthy();
    expect(screen.queryByText('Batch complete')).toBeNull();
  });

  it('keeps the plain batch label while the batch is in progress', () => {
    render(<BatchProgress progress={makeStudyProgress()} />);

    expect(screen.getByText('Batch 1')).toBeTruthy();
    expect(screen.queryByText(/completed/)).toBeNull();
  });

  it('shows time-based progress in batch', () => {
    // Batch is 2026-08-01 to 2026-08-31 (30 days total)
    // Mock today to be 2026-08-11 (10 days elapsed = 33.3%)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11'));

    render(<BatchProgress progress={makeStudyProgress()} />);

    // Progress bar should reflect time elapsed (10/30 = 33.3%)
    const progressBar = screen.getByTestId('batch-progress-bar');
    expect(progressBar).toHaveStyle({ width: '33.33333333333333%' });

    vi.useRealTimers();
  });

  it('shows Total participants with max count from completionCounts', () => {
    const completionCounts = new Map([
      ['phq2', 12],
      ['big-five-inventory', 8]
    ]);
    render(
      <BatchProgress
        progress={makeStudyProgress()}
        completionCounts={completionCounts}
      />
    );

    expect(screen.getByText('Total participants: 12')).toBeTruthy();
  });

  it('shows Total participants: 0 when completionCounts is empty', () => {
    render(
      <BatchProgress
        progress={makeStudyProgress()}
        completionCounts={new Map()}
      />
    );

    expect(screen.getByText('Total participants: 0')).toBeTruthy();
  });

  it('shows Total participants: 0 when completionCounts is undefined', () => {
    render(<BatchProgress progress={makeStudyProgress()} />);

    expect(screen.getByText('Total participants: 0')).toBeTruthy();
  });

  it('does not show X/Y questionnaires text', () => {
    render(
      <BatchProgress
        progress={makeStudyProgress()}
        completionCounts={new Map([['phq2', 10]])}
      />
    );

    expect(screen.queryByText(/questionnaires/)).toBeNull();
  });
});

describe('TimelineStrip', () => {
  it('styles the current completed batch chip teal with a white label', () => {
    const batch2 = makeUpcomingBatch('batch-2', '2026-09-01', '2026-09-30');
    render(
      <TimelineStrip
        progress={makeStudyProgress({
          batches: [BATCH_1, batch2],
          currentBatch: batch2,
          completedCount: 1,
          isComplete: true,
          firstUncompletedQuestionnaireId: null,
          completedQuestionnaireIds: ['phq2'],
          history: [
            {
              batchId: 'batch-1',
              start: '2026-08-01',
              end: '2026-08-31',
              participated: true
            },
            {
              batchId: 'batch-2',
              start: '2026-09-01',
              end: '2026-09-30',
              participated: true
            }
          ]
        })}
      />
    );

    const currentChip = screen.getByTestId('batch-chip-batch-2');
    expect(currentChip).toHaveClass('bg-secondary', 'text-white');
    expect(currentChip).toHaveTextContent('B2');
  });

  it('marks the current in-progress batch chip with a teal ring', () => {
    render(<TimelineStrip progress={makeStudyProgress()} />);

    const activeChip = screen.getByTestId('batch-chip-batch-1');
    expect(activeChip).toHaveClass('ring-2', 'ring-secondary');
  });

  it('omits the consecutive-batch streak text', () => {
    render(
      <TimelineStrip progress={makeStudyProgress({ consecutiveBatches: 3 })} />
    );

    expect(screen.queryByText(/in a row/)).toBeNull();
  });
});

describe('QuestionnaireList', () => {
  it('renders questionnaire titles from the title map', () => {
    renderList({ titleMap: TITLE_MAP });

    expect(screen.getByRole('button', { name: 'PHQ-2' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Big Five Inventory' })
    ).toBeTruthy();
  });

  it('falls back to the id-derived name when the title is missing', () => {
    renderList({ titleMap: new Map() });

    expect(screen.getByRole('button', { name: 'PHQ2' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'BIG FIVE INVENTORY' })
    ).toBeTruthy();
  });

  it('shows a pulsing skeleton for unresolved titles while loading', () => {
    renderList({
      titleMap: new Map([['phq2', { title: 'PHQ-2', durationMinutes: 8 }]]),
      isTitlesLoading: true
    });

    expect(screen.getByRole('button', { name: 'PHQ-2' })).toBeTruthy();
    expect(
      screen.getByTestId('questionnaire-title-skeleton-big-five-inventory')
    ).toHaveClass('animate-pulse');
    expect(
      screen.queryByRole('button', { name: 'BIG FIVE INVENTORY' })
    ).toBeNull();
  });

  it('left-justifies the questionnaire name button', () => {
    renderList({ titleMap: TITLE_MAP });

    expect(screen.getByRole('button', { name: 'PHQ-2' })).toHaveClass(
      'text-left'
    );
  });

  it('does not show XP value', () => {
    renderList({ titleMap: TITLE_MAP });

    expect(screen.queryByText(/XP/)).toBeNull();
  });

  it('hides overlap hints in the standard view', () => {
    renderList({ titleMap: TITLE_MAP, showOverlapHints: false });

    expect(screen.queryByText(/Also counts toward/)).toBeNull();
  });

  it('shows overlap hints in the expanded view', () => {
    renderList({ titleMap: TITLE_MAP, showOverlapHints: true });

    expect(
      screen.getAllByText(/Also counts toward Sleep Quality Study/).length
    ).toBeGreaterThan(0);
  });

  it('does not show completion counts', () => {
    const completionCounts = new Map([
      ['phq2', 12],
      ['big-five-inventory', 3]
    ]);
    renderList({
      titleMap: TITLE_MAP,
      completionCounts
    });

    expect(screen.queryByText('12 completions')).toBeNull();
    expect(screen.queryByText('< 5 completions')).toBeNull();
  });
});
