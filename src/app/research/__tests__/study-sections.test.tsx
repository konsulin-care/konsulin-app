import type { QuestionnaireInfo } from '@/services/api/research';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('shows the XP value next to questionnaires with a known duration', () => {
    renderList({ titleMap: TITLE_MAP });

    expect(screen.getAllByText('+40 XP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+75 XP').length).toBeGreaterThan(0);
  });

  it('renders the XP value beside the title on the same row', () => {
    renderList({ titleMap: TITLE_MAP });

    const title = screen.getByRole('button', { name: 'PHQ-2' });
    const xp = screen.getByText('+40 XP');
    expect(title.parentElement).toBe(xp.parentElement);
  });

  it('omits the XP value when the duration is unknown', () => {
    renderList({
      titleMap: new Map([['phq2', { title: 'PHQ-2', durationMinutes: null }]])
    });

    expect(screen.queryByText('+40 XP')).toBeNull();
    expect(screen.queryByText('+75 XP')).toBeNull();
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
});
