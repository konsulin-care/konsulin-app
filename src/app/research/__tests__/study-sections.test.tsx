import type { QuestionnaireInfo } from '@/services/api/research';
import { formatBatchDate } from '@/utils/format-batch-date';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BatchProgress,
  buildOverlapMap,
  QuestionnaireList
} from '../study-sections';
import { BATCH_1, makeStudyB, makeStudyProgress } from './research-fixtures';

vi.mock('@/i18n', async () => {
  const { createUseTranslationsMock } =
    await import('@/i18n/__tests__/test-messages');
  return { useTranslations: createUseTranslationsMock() };
});

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

const CLOSES_DATE = formatBatchDate(BATCH_1.end, 'id');

describe('BatchProgress', () => {
  it('labels a completed batch with the completed suffix and date', () => {
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

    expect(screen.getByTestId('batch-line')).toHaveTextContent(
      `Batch 1 of 1 completed · Closes ${CLOSES_DATE}`
    );
    expect(screen.queryByText('Batch complete')).toBeNull();
  });

  it('keeps the current batch label while the batch is in progress', () => {
    render(<BatchProgress progress={makeStudyProgress()} />);

    expect(screen.getByTestId('batch-line')).toHaveTextContent(
      `Batch 1 of 1 · Closes ${CLOSES_DATE}`
    );
    expect(screen.queryByText(/completed/)).toBeNull();
  });

  it('renders no elapsed-days progress bar', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11'));

    render(<BatchProgress progress={makeStudyProgress()} />);

    expect(screen.queryByTestId('batch-progress-bar')).toBeNull();

    vi.useRealTimers();
  });

  it('renders only the batch line and never a participant count', () => {
    render(<BatchProgress progress={makeStudyProgress()} />);

    expect(screen.getByTestId('batch-line')).toBeTruthy();
    expect(screen.queryByText(/Total participants/)).toBeNull();
    expect(screen.queryByText(/people have joined/)).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'About this count' })
    ).toBeNull();
  });

  it('does not show X/Y questionnaires text', () => {
    render(<BatchProgress progress={makeStudyProgress()} />);

    expect(screen.queryByText(/questionnaires/)).toBeNull();
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
});
