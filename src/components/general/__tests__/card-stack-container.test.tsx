import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useQuestionFocus', async () =>
  (await import('./card-stack-test-fixtures')).questionFocusMockFactory()
);
vi.mock('@/hooks/useCardSwipe', async () =>
  (await import('./card-stack-test-fixtures')).cardSwipeMockFactory()
);
vi.mock('../card-dom-mapper', async () =>
  (await import('./card-stack-test-fixtures')).cardDomMapperMockFactory()
);
vi.mock('@/i18n', async () =>
  (await import('./card-stack-test-fixtures')).cardStackI18nMockFactory()
);
vi.mock('react-toastify', async () =>
  (await import('./card-stack-test-fixtures')).toastMockFactory()
);
vi.mock('@/lib/injectCardStyles', async () =>
  (await import('./card-stack-test-fixtures')).injectCardStylesMockFactory()
);

import { CardStackContainer } from '../card-stack-container';
import {
  BASE,
  defaultSwipeResult,
  mockF,
  mockStyles,
  mockSwipe,
  mockToast,
  renderCards
} from './card-stack-test-fixtures';

describe('CardStackContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockF.mockReturnValue(BASE);
    mockSwipe.mockReturnValue(defaultSwipeResult());
  });

  it('renders children', () => {
    renderCards(
      <CardStackContainer>
        <div data-testid='child'>Form</div>
      </CardStackContainer>
    );
    expect(document.querySelector('.card-stack-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows progress', () => {
    renderCards(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
  });

  it('hides Previous and Skip', () => {
    renderCards(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.queryByText(/Previous|Skip/i)).toBeNull();
  });

  it('updates styles on state change', () => {
    renderCards(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(mockStyles).toHaveBeenCalledWith({
      activeLinkId: 'q1',
      answeredLinkIds: [],
      futureLinkIds: ['q2', 'q3'],
      displayItemLinkIds: []
    });
    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 1,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' }
    });
    const { rerender } = renderCards(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    rerender(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(mockStyles).toHaveBeenCalledWith({
      activeLinkId: 'q2',
      answeredLinkIds: ['q1'],
      futureLinkIds: ['q3'],
      displayItemLinkIds: []
    });
  });

  it('advances on swipe up', () => {
    const setActiveCardIndex = vi.fn();
    mockF.mockReturnValue({ ...BASE, setActiveCardIndex });
    mockSwipe.mockReturnValue({
      ...defaultSwipeResult(),
      swipeDirection: 'up'
    });
    renderCards(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(setActiveCardIndex).toHaveBeenCalledWith(1);
  });

  it('retreats on swipe down', () => {
    const setActiveCardIndex = vi.fn();
    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 1,
      setActiveCardIndex,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' }
    });
    mockSwipe.mockReturnValue({
      ...defaultSwipeResult(),
      swipeDirection: 'down'
    });
    renderCards(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(setActiveCardIndex).toHaveBeenCalledWith(0);
  });

  it('does not block swipe on required unanswered card', () => {
    const setActiveCardIndex = vi.fn();
    mockF.mockReturnValue({
      ...BASE,
      setActiveCardIndex,
      cardStates: { q1: 'answered', q2: 'future', q3: 'future' },
      isRequired: vi.fn().mockImplementation((id: string) => id === 'q2'),
      isAnswered: vi.fn().mockImplementation((id: string) => id === 'q1')
    });
    mockSwipe.mockReturnValue({
      ...defaultSwipeResult(),
      swipeDirection: 'up'
    });
    renderCards(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(setActiveCardIndex).toHaveBeenCalledWith(1);
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});
