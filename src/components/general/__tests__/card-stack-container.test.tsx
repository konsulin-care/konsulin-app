import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockUseQuestionFocus,
  mockUseCardSwipe,
  mockToast,
  mockInjectCardStyles
} = vi.hoisted(() => ({
  mockUseQuestionFocus: vi.fn<() => any>(),
  mockUseCardSwipe: vi.fn<() => any>(),
  mockToast: { error: vi.fn() } as Record<string, (...args: any[]) => any>,
  mockInjectCardStyles: vi.fn().mockReturnValue(vi.fn())
}));

vi.mock('@/hooks/useQuestionFocus', () => ({
  useQuestionFocus: mockUseQuestionFocus
}));

vi.mock('@/hooks/useCardSwipe', () => ({
  useCardSwipe: mockUseCardSwipe
}));

vi.mock('../card-dom-mapper', () => ({
  CardDomMapper: () => null
}));

vi.mock('react-toastify', () => ({
  toast: mockToast
}));

vi.mock('@/lib/injectCardStyles', () => ({
  injectCardStyles: mockInjectCardStyles
}));

import { CardStackContainer } from '../card-stack-container';

const defaultFocus = {
  activeCardIndex: 0,
  setActiveCardIndex: vi.fn(),
  totalFocusable: 3,
  totalAnswerable: 3,
  cardStates: { q1: 'active', q2: 'future', q3: 'future' },
  displayItemLinkIds: [],
  focusableLinkIds: ['q1', 'q2', 'q3'],
  isRequired: vi.fn().mockReturnValue(false),
  isAnswered: vi.fn().mockReturnValue(false)
};

describe('CardStackContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionFocus.mockReturnValue(defaultFocus);
    mockUseCardSwipe.mockReturnValue({
      swipeDirection: null,
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });
  });

  it('renders children inside card-stack-viewport', () => {
    render(
      <CardStackContainer>
        <div data-testid='child'>Form content</div>
      </CardStackContainer>
    );
    const viewport = document.querySelector('.card-stack-viewport');
    expect(viewport).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders progress indicator', () => {
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
  });

  it('hides Previous button on first card', () => {
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.queryByText(/Previous/i)).not.toBeInTheDocument();
  });

  it('shows Previous button when not first card', () => {
    mockUseQuestionFocus.mockReturnValue({
      ...defaultFocus,
      activeCardIndex: 1,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' }
    });
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.getByText(/Previous/i)).toBeInTheDocument();
  });

  it('shows Skip when next card is not required', () => {
    mockUseQuestionFocus.mockReturnValue({
      ...defaultFocus,
      isRequired: vi.fn().mockReturnValue(false)
    });
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.getByText(/Skip/i)).toBeInTheDocument();
  });

  it('hides Skip when next card is required and unanswered', () => {
    mockUseQuestionFocus.mockReturnValue({
      ...defaultFocus,
      isRequired: vi.fn().mockImplementation((id: string) => id === 'q2')
    });
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.queryByText(/Skip/i)).not.toBeInTheDocument();
  });

  it('disables Skip on last card', () => {
    mockUseQuestionFocus.mockReturnValue({
      ...defaultFocus,
      activeCardIndex: 2,
      cardStates: { q1: 'answered', q2: 'answered', q3: 'active' }
    });
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.queryByText(/Skip/i)).not.toBeInTheDocument();
  });

  it('updates card styles when cardStates change', () => {
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(mockInjectCardStyles).toHaveBeenCalledWith({
      activeLinkId: 'q1',
      answeredLinkIds: [],
      futureLinkIds: ['q2', 'q3'],
      displayItemLinkIds: []
    });

    mockUseQuestionFocus.mockReturnValue({
      ...defaultFocus,
      activeCardIndex: 1,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' }
    });
    const { rerender } = render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    rerender(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(mockInjectCardStyles).toHaveBeenCalledWith({
      activeLinkId: 'q2',
      answeredLinkIds: ['q1'],
      futureLinkIds: ['q3'],
      displayItemLinkIds: []
    });
  });

  it('advances on swipe up', () => {
    const setActiveCardIndex = vi.fn();
    mockUseQuestionFocus.mockReturnValue({
      ...defaultFocus,
      setActiveCardIndex
    });
    mockUseCardSwipe.mockReturnValue({
      swipeDirection: 'up',
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(setActiveCardIndex).toHaveBeenCalledWith(1);
  });

  it('retreats on swipe down', () => {
    const setActiveCardIndex = vi.fn();
    mockUseQuestionFocus.mockReturnValue({
      ...defaultFocus,
      activeCardIndex: 1,
      setActiveCardIndex,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' }
    });
    mockUseCardSwipe.mockReturnValue({
      swipeDirection: 'down',
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(setActiveCardIndex).toHaveBeenCalledWith(0);
  });

  describe('click-to-navigate', () => {
    const setActiveCardIndex = vi.fn();

    beforeEach(() => {
      setActiveCardIndex.mockClear();
      mockUseQuestionFocus.mockReturnValue({
        ...defaultFocus,
        activeCardIndex: 1,
        setActiveCardIndex,
        cardStates: { q1: 'answered', q2: 'active', q3: 'future' }
      });
    });

    function renderWithCards(
      cards: Array<{ className: string; linkId: string; text?: string }>
    ) {
      render(
        <CardStackContainer>
          {cards.map(c => (
            <div key={c.linkId} className={c.className} data-link-id={c.linkId}>
              {c.text ?? c.className}
            </div>
          ))}
        </CardStackContainer>
      );
    }

    function getCard(className: string) {
      return document.querySelector(`.${className}`);
    }

    it('navigates to answered card', () => {
      renderWithCards([
        { className: 'card-answered', linkId: 'q1' },
        { className: 'card-active', linkId: 'q2' }
      ]);
      const answered = getCard('card-answered');
      expect(answered).toBeInTheDocument();
      fireEvent.click(answered);
      expect(setActiveCardIndex).toHaveBeenCalledWith(0);
    });

    it('navigates to future card', () => {
      renderWithCards([
        { className: 'card-answered', linkId: 'q1' },
        { className: 'card-active', linkId: 'q2' },
        { className: 'card-future', linkId: 'q3' }
      ]);
      const future = getCard('card-future');
      expect(future).toBeInTheDocument();
      fireEvent.click(future);
      expect(setActiveCardIndex).toHaveBeenCalledWith(2);
    });

    it('does nothing on active card click', () => {
      renderWithCards([
        { className: 'card-answered', linkId: 'q1' },
        { className: 'card-active', linkId: 'q2' }
      ]);
      const active = getCard('card-active');
      expect(active).toBeInTheDocument();
      fireEvent.click(active);
      expect(setActiveCardIndex).not.toHaveBeenCalled();
    });
  });

  it('shows toast when swiping up on required unanswered card', () => {
    const setActiveCardIndex = vi.fn();
    mockUseQuestionFocus.mockReturnValue({
      ...defaultFocus,
      setActiveCardIndex,
      cardStates: { q1: 'answered', q2: 'future', q3: 'future' },
      isRequired: vi.fn().mockImplementation((id: string) => id === 'q2'),
      isAnswered: vi.fn().mockImplementation((id: string) => id === 'q1')
    });
    mockUseCardSwipe.mockReturnValue({
      swipeDirection: 'up',
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(setActiveCardIndex).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('skip')
    );
  });
});
