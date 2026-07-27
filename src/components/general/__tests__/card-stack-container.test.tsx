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

  it('hides Previous and Skip buttons', () => {
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.queryByText(/Previous/i)).toBeNull();
    expect(screen.queryByText(/Skip/i)).toBeNull();
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
    const setActive = vi.fn();

    beforeEach(() => {
      setActive.mockClear();
      mockUseQuestionFocus.mockReturnValue({
        ...defaultFocus,
        activeCardIndex: 1,
        setActiveCardIndex: setActive,
        cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
        isRequired: vi.fn().mockReturnValue(false),
        isAnswered: vi.fn().mockReturnValue(false)
      });
    });

    function renderCards(cards: { cls: string; id: string }[]) {
      render(
        <CardStackContainer>
          {cards.map(c => (
            <div key={c.id} className={c.cls} data-link-id={c.id}>
              {c.id}
            </div>
          ))}
        </CardStackContainer>
      );
    }

    function queryCard(cls: string) {
      return document.querySelector('.' + cls);
    }

    it('navigates to answered card', () => {
      renderCards([
        { cls: 'card-answered', id: 'q1' },
        { cls: 'card-active', id: 'q2' }
      ]);
      fireEvent.click(queryCard('card-answered'));
      expect(setActive).toHaveBeenCalledWith(0);
    });

    it('navigates to future card and saves origin', () => {
      renderCards([
        { cls: 'card-answered', id: 'q1' },
        { cls: 'card-active', id: 'q2' },
        { cls: 'card-future', id: 'q3' }
      ]);
      fireEvent.click(queryCard('card-future'));
      expect(setActive).toHaveBeenCalledWith(2);
    });

    it('does nothing on active card click', () => {
      renderCards([
        { cls: 'card-answered', id: 'q1' },
        { cls: 'card-active', id: 'q2' }
      ]);
      fireEvent.click(queryCard('card-active'));
      expect(setActive).not.toHaveBeenCalled();
    });

    it('blocks future click when current is required', () => {
      mockUseQuestionFocus.mockReturnValue({
        ...defaultFocus,
        activeCardIndex: 1,
        setActiveCardIndex: setActive,
        cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
        isRequired: vi.fn().mockReturnValue(true),
        isAnswered: vi.fn().mockReturnValue(false)
      });
      renderCards([
        { cls: 'card-answered', id: 'q1' },
        { cls: 'card-active', id: 'q2' },
        { cls: 'card-future', id: 'q3' }
      ]);
      fireEvent.click(queryCard('card-future'));
      expect(setActive).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('skip')
      );
    });

    it('navigates to skipped card', () => {
      mockUseQuestionFocus.mockReturnValue({
        ...defaultFocus,
        activeCardIndex: 2,
        setActiveCardIndex: setActive,
        cardStates: {
          q1: 'answered',
          q2: 'skipped',
          q3: 'active',
          q4: 'future'
        },
        focusableLinkIds: ['q1', 'q2', 'q3', 'q4'],
        totalFocusable: 4
      });
      renderCards([
        { cls: 'card-answered', id: 'q1' },
        { cls: 'card-skipped', id: 'q2' },
        { cls: 'card-active', id: 'q3' },
        { cls: 'card-future', id: 'q4' }
      ]);
      fireEvent.click(queryCard('card-skipped'));
      expect(setActive).toHaveBeenCalledWith(1);
    });

    it('returns to origin when visited card becomes answered', () => {
      const { rerender } = render(
        <CardStackContainer>
          <div className='card-answered' data-link-id='q1'>
            q1
          </div>
          <div className='card-active' data-link-id='q2'>
            q2
          </div>
          <div className='card-future' data-link-id='q3'>
            q3
          </div>
        </CardStackContainer>
      );
      fireEvent.click(queryCard('card-future'));
      expect(setActive).toHaveBeenCalledWith(2);
      setActive.mockClear();
      mockUseQuestionFocus.mockReturnValue({
        ...defaultFocus,
        activeCardIndex: 2,
        setActiveCardIndex: setActive,
        cardStates: { q1: 'answered', q2: 'future', q3: 'answered' }
      });
      rerender(
        <CardStackContainer>
          <div className='card-answered' data-link-id='q1'>
            q1
          </div>
          <div className='card-future' data-link-id='q2'>
            q2
          </div>
          <div className='card-answered' data-link-id='q3'>
            q3
          </div>
        </CardStackContainer>
      );
      expect(setActive).toHaveBeenCalledWith(1);
    });

    it('does not track return for already-answered card', () => {
      const ls = vi.fn();
      const base = {
        activeCardIndex: 1,
        setActiveCardIndex: ls,
        totalFocusable: 3,
        totalAnswerable: 2,
        displayItemLinkIds: [],
        focusableLinkIds: ['q1', 'q2', 'q3'],
        cardStates: { q1: 'answered', q2: 'active', q3: 'future' }
      };
      mockUseQuestionFocus.mockReturnValue({
        ...base,
        isRequired: vi.fn().mockReturnValue(false),
        isAnswered: vi.fn().mockReturnValue(true)
      });
      const { rerender } = render(
        <CardStackContainer>
          <div className='card-answered' data-link-id='q1'>
            q1
          </div>
          <div className='card-active' data-link-id='q2'>
            q2
          </div>
          <div className='card-future' data-link-id='q3'>
            q3
          </div>
        </CardStackContainer>
      );
      fireEvent.click(queryCard('card-answered'));
      expect(ls).toHaveBeenCalledWith(0);
      ls.mockClear();
      mockUseQuestionFocus.mockReturnValue({
        ...base,
        isRequired: vi.fn().mockReturnValue(false),
        isAnswered: vi.fn().mockReturnValue(false)
      });
      rerender(
        <CardStackContainer>
          <div className='card-answered' data-link-id='q1'>
            q1
          </div>
          <div className='card-active' data-link-id='q2'>
            q2
          </div>
          <div className='card-future' data-link-id='q3'>
            q3
          </div>
        </CardStackContainer>
      );
      expect(ls).not.toHaveBeenCalled();
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
