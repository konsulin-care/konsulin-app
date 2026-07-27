import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseQuestionFocus } = vi.hoisted(() => ({
  mockUseQuestionFocus: vi.fn<() => any>()
}));

vi.mock('@/hooks/useQuestionFocus', () => ({
  useQuestionFocus: mockUseQuestionFocus
}));

import { CardDomMapper } from '../card-dom-mapper';

interface FocusState {
  cardStates: Record<string, string>;
  displayItemLinkIds: string[];
  focusableLinkIds: string[];
  activeCardIndex: number;
}

function createQuestionCard(linkId: string): {
  container: HTMLElement;
  label: HTMLElement;
} {
  const container = document.createElement('div');
  container.className = 'MuiGrid-root MuiGrid-container';

  const labelCol = document.createElement('div');
  labelCol.className = 'MuiGrid-root MuiGrid-grid-xs-12';

  const label = document.createElement('label');
  label.id = `label-${linkId}`;
  label.textContent = 'Question';

  labelCol.append(label);
  container.append(labelCol);
  container.append(document.createElement('div'));

  return { container, label };
}

function createDisplayCard(linkId: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'MuiGrid-root MuiGrid-container';

  const labelCol = document.createElement('div');
  labelCol.className = 'MuiGrid-root MuiGrid-grid-xs-12';

  const span = document.createElement('span');
  span.id = `label-${linkId}`;
  span.textContent = 'Instruction';

  labelCol.append(span);
  container.append(labelCol);

  return container;
}

function createWrapper(): {
  wrapper: HTMLDivElement;
  containerRef: React.RefObject<HTMLDivElement>;
} {
  const wrapper = document.createElement('div');
  wrapper.className = 'card-stack-viewport';
  document.body.append(wrapper);

  return {
    wrapper,
    containerRef: { current: wrapper } as React.RefObject<HTMLDivElement>
  };
}

const defaultFocusState: FocusState = {
  cardStates: { q1: 'active', q2: 'future', q3: 'future' },
  displayItemLinkIds: ['inst'],
  focusableLinkIds: ['q1', 'q2', 'q3'],
  activeCardIndex: 0
};

describe('CardDomMapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionFocus.mockReturnValue(defaultFocusState);
    document.body.innerHTML = '';
  });

  it('assigns card-question-container class to question card containers', () => {
    const focusState: FocusState = {
      cardStates: { q1: 'active', q2: 'future' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2'],
      activeCardIndex: 0
    };
    mockUseQuestionFocus.mockReturnValue(focusState);

    const { wrapper, containerRef } = createWrapper();
    const { container: c1 } = createQuestionCard('q1');
    const { container: c2 } = createQuestionCard('q2');
    wrapper.append(c1, c2);

    render(<CardDomMapper containerRef={containerRef} />);

    expect(c1.classList.contains('card-question-container')).toBe(true);
    expect(c2.classList.contains('card-question-container')).toBe(true);
    expect(c1.dataset.linkId).toBe('q1');
    expect(c2.dataset.linkId).toBe('q2');

    wrapper.remove();
  });

  it('assigns correct state class (card-active, card-answered, card-future)', () => {
    const focusState: FocusState = {
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2', 'q3'],
      activeCardIndex: 1
    };
    mockUseQuestionFocus.mockReturnValue(focusState);

    const { wrapper, containerRef } = createWrapper();
    const { container: q1 } = createQuestionCard('q1');
    const { container: q2 } = createQuestionCard('q2');
    const { container: q3 } = createQuestionCard('q3');
    wrapper.append(q1, q2, q3);

    render(<CardDomMapper containerRef={containerRef} />);

    expect(q1.classList.contains('card-answered')).toBe(true);
    expect(q2.classList.contains('card-active')).toBe(true);
    expect(q3.classList.contains('card-future')).toBe(true);

    wrapper.remove();
  });

  it('assigns card-display-item class to display item containers', () => {
    const focusState: FocusState = {
      cardStates: { q1: 'active' },
      displayItemLinkIds: ['inst'],
      focusableLinkIds: ['q1'],
      activeCardIndex: 0
    };
    mockUseQuestionFocus.mockReturnValue(focusState);

    const { wrapper, containerRef } = createWrapper();
    const { container: q1 } = createQuestionCard('q1');
    const displayCard = createDisplayCard('inst');
    wrapper.append(displayCard, q1);

    render(<CardDomMapper containerRef={containerRef} />);

    expect(displayCard.classList.contains('card-display-item')).toBe(true);
    expect(q1.classList.contains('card-display-item')).toBe(false);
    expect(q1.classList.contains('card-question-container')).toBe(true);

    wrapper.remove();
  });

  it('cleans up class mutations on unmount', () => {
    const focusState: FocusState = {
      cardStates: { q1: 'active', q2: 'future' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2'],
      activeCardIndex: 0
    };
    mockUseQuestionFocus.mockReturnValue(focusState);

    const { wrapper, containerRef } = createWrapper();
    const { container: q1 } = createQuestionCard('q1');
    const { container: q2 } = createQuestionCard('q2');
    wrapper.append(q1, q2);

    const { unmount } = render(<CardDomMapper containerRef={containerRef} />);

    expect(q1.classList.contains('card-question-container')).toBe(true);

    unmount();

    // Classes should be removed
    expect(q1.classList.contains('card-question-container')).toBe(false);

    wrapper.remove();
  });

  it('handles missing DOM nodes gracefully (items not yet rendered)', () => {
    mockUseQuestionFocus.mockReturnValue(defaultFocusState);

    const { wrapper, containerRef } = createWrapper();
    // No cards added to DOM

    expect(() =>
      render(<CardDomMapper containerRef={containerRef} />)
    ).not.toThrow();

    wrapper.remove();
  });

  it('handles null containerRef gracefully', () => {
    const nullRef = { current: null } as React.RefObject<HTMLDivElement>;

    expect(() =>
      render(<CardDomMapper containerRef={nullRef} />)
    ).not.toThrow();
  });
});
