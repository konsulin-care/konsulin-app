import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildOverlapMap, QuestionnaireList } from '../study-sections';
import { makeStudyB, makeStudyProgress } from './research-fixtures';

const TITLE_MAP = {
  phq2: 'PHQ-2',
  'big-five-inventory': 'Big Five Inventory'
};

/** Renders the list for the base study, which overlaps study-b on phq2. */
function renderList(
  props: {
    titleMap?: Record<string, string>;
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

describe('QuestionnaireList', () => {
  it('renders questionnaire titles from the title map', () => {
    renderList({ titleMap: TITLE_MAP });

    expect(screen.getByRole('button', { name: 'PHQ-2' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Big Five Inventory' })
    ).toBeTruthy();
  });

  it('falls back to the id-derived name when the title is missing', () => {
    renderList({ titleMap: {} });

    expect(screen.getByRole('button', { name: 'PHQ2' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'BIG FIVE INVENTORY' })
    ).toBeTruthy();
  });

  it('shows a pulsing skeleton for unresolved titles while loading', () => {
    renderList({ titleMap: { phq2: 'PHQ-2' }, isTitlesLoading: true });

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
