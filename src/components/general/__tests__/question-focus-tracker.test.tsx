import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseQuestionFocus, mockCurrentPageIndex } = vi.hoisted(() => ({
  mockUseQuestionFocus: vi.fn<() => { activeLinkId: string | null }>(),
  mockCurrentPageIndex: vi.fn<() => number>().mockReturnValue(0)
}));

vi.mock('@/hooks/useQuestionFocus', () => ({
  useQuestionFocus: mockUseQuestionFocus
}));

vi.mock('@aehrc/smart-forms-renderer', () => ({
  useQuestionnaireStore: Object.assign(vi.fn(), {
    use: {
      currentPageIndex: mockCurrentPageIndex
    }
  })
}));

import { QuestionFocusTracker } from '../question-focus-tracker';

function createCard(labelId: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'MuiGrid-root MuiGrid-container';

  const labelCol = document.createElement('div');
  labelCol.className = 'MuiGrid-root MuiGrid-grid-xs-12';

  const label = document.createElement('label');
  label.id = labelId;
  label.textContent = 'Question';

  labelCol.append(label);
  container.append(labelCol);

  const fieldCol = document.createElement('div');
  fieldCol.className = 'MuiGrid-root MuiGrid-grid-xs-12';
  container.append(fieldCol);

  return container;
}

function createDisplayCard(linkId: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'MuiGrid-root MuiGrid-container';

  const labelCol = document.createElement('div');
  labelCol.className = 'MuiGrid-root MuiGrid-grid-xs-12';

  const span = document.createElement('span');
  span.id = 'label-' + linkId;
  span.textContent = 'Instruction';

  labelCol.append(span);
  container.append(labelCol);

  return container;
}

describe('QuestionFocusTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionFocus.mockReturnValue({ activeLinkId: null });
    mockCurrentPageIndex.mockReturnValue(0);

    // Remove any leftover style elements from previous tests
    document.head.querySelectorAll('style').forEach(el => el.remove());
  });

  it('injects a <style> element on mount and removes it on unmount', () => {
    const initialStyles = document.head.querySelectorAll('style').length;

    const { unmount } = render(<QuestionFocusTracker />);

    expect(document.head.querySelectorAll('style').length).toBe(
      initialStyles + 1
    );

    unmount();

    expect(document.head.querySelectorAll('style').length).toBe(initialStyles);
  });

  it('adds "question-card" class to all label-containing containers on mount', async () => {
    const card1 = createCard('label-q1');
    const card2 = createCard('label-q2');
    document.body.append(card1, card2);

    render(<QuestionFocusTracker />);

    await waitFor(() => {
      expect(card1.classList.contains('question-card')).toBe(true);
      expect(card2.classList.contains('question-card')).toBe(true);
    });

    card1.remove();
    card2.remove();
  });

  it('skips display items (span, not label) when adding base class', async () => {
    const questionCard = createCard('label-q1');
    const displayCard = createDisplayCard('inst');
    document.body.append(questionCard, displayCard);

    render(<QuestionFocusTracker />);

    await waitFor(() => {
      expect(questionCard.classList.contains('question-card')).toBe(true);
      expect(displayCard.classList.contains('question-card')).toBe(false);
    });

    questionCard.remove();
    displayCard.remove();
  });

  it('toggles "question-card--active" when activeLinkId changes', async () => {
    const card1 = createCard('label-q1');
    const card2 = createCard('label-q2');
    document.body.append(card1, card2);

    mockUseQuestionFocus.mockReturnValue({ activeLinkId: 'q1' });

    const { rerender } = render(<QuestionFocusTracker />);

    await waitFor(() => {
      expect(card1.classList.contains('question-card--active')).toBe(true);
      expect(card2.classList.contains('question-card--active')).toBe(false);
    });

    mockUseQuestionFocus.mockReturnValue({ activeLinkId: 'q2' });

    rerender(<QuestionFocusTracker />);

    await waitFor(() => {
      expect(card1.classList.contains('question-card--active')).toBe(false);
      expect(card2.classList.contains('question-card--active')).toBe(true);
    });

    card1.remove();
    card2.remove();
  });

  it('removes all injected classes on unmount', async () => {
    const card = createCard('label-q1');
    document.body.append(card);
    mockUseQuestionFocus.mockReturnValue({ activeLinkId: 'q1' });

    const { unmount } = render(<QuestionFocusTracker />);

    await waitFor(() => {
      expect(card.classList.contains('question-card')).toBe(true);
    });

    unmount();

    expect(card.classList.contains('question-card')).toBe(false);
    expect(card.classList.contains('question-card--active')).toBe(false);

    card.remove();
  });
});
