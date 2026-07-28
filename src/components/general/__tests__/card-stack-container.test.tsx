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
vi.mock('@/hooks/useCardSwipe', () => ({ useCardSwipe: mockUseCardSwipe }));
vi.mock('../card-dom-mapper', () => ({ CardDomMapper: () => null }));
vi.mock('react-toastify', () => ({ toast: mockToast }));
vi.mock('@/lib/injectCardStyles', () => ({
  injectCardStyles: mockInjectCardStyles
}));

import { CardStackContainer } from '../card-stack-container';

const FOCUS = {
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

/** Render card elements inside CardStackContainer. */
function renderCards(classes: Record<string, string>) {
  return render(
    <CardStackContainer>
      {Object.entries(classes).map(([id, cls]) => (
        <div key={id} className={cls} data-link-id={id}>
          {id}
        </div>
      ))}
    </CardStackContainer>
  );
}

describe('CardStackContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuestionFocus.mockReturnValue(FOCUS);
    mockUseCardSwipe.mockReturnValue({
      swipeDirection: null,
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });
  });

  it('renders children', () => {
    render(
      <CardStackContainer>
        <div data-testid='child'>Form</div>
      </CardStackContainer>
    );
    expect(document.querySelector('.card-stack-viewport')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows progress indicator', () => {
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

  it('updates card styles on state change', () => {
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
      ...FOCUS,
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
    const setIdx = vi.fn();
    mockUseQuestionFocus.mockReturnValue({
      ...FOCUS,
      setActiveCardIndex: setIdx
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
    expect(setIdx).toHaveBeenCalledWith(1);
  });

  it('retreats on swipe down', () => {
    const setIdx = vi.fn();
    mockUseQuestionFocus.mockReturnValue({
      ...FOCUS,
      activeCardIndex: 1,
      setActiveCardIndex: setIdx,
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
    expect(setIdx).toHaveBeenCalledWith(0);
  });

  describe('click-to-navigate', () => {
    let setActive: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      setActive = vi.fn();
      mockUseQuestionFocus.mockReturnValue({
        ...FOCUS,
        setActiveCardIndex: setActive,
        activeCardIndex: 1,
        cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
        isRequired: vi.fn().mockReturnValue(false),
        isAnswered: vi.fn().mockReturnValue(false)
      });
    });

    it('navigates to answered card', () => {
      renderCards({ q1: 'card-answered', q2: 'card-active' });
      fireEvent.click(document.querySelector('.card-answered'));
      expect(setActive).toHaveBeenCalledWith(0);
    });

    it('navigates to future card', () => {
      renderCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      });
      fireEvent.click(document.querySelector('.card-future'));
      expect(setActive).toHaveBeenCalledWith(2);
    });

    it('ignores click on active card', () => {
      renderCards({ q1: 'card-answered', q2: 'card-active' });
      fireEvent.click(document.querySelector('.card-active'));
      expect(setActive).not.toHaveBeenCalled();
    });

    it('blocks future click when current is required', () => {
      mockUseQuestionFocus.mockReturnValue({
        ...FOCUS,
        activeCardIndex: 1,
        setActiveCardIndex: setActive,
        cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
        isRequired: vi.fn().mockReturnValue(true),
        isAnswered: vi.fn().mockReturnValue(false)
      });
      renderCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      });
      fireEvent.click(document.querySelector('.card-future'));
      expect(setActive).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('skip')
      );
    });

    it('navigates to skipped card', () => {
      mockUseQuestionFocus.mockReturnValue({
        ...FOCUS,
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
      renderCards({
        q1: 'card-answered',
        q2: 'card-skipped',
        q3: 'card-active',
        q4: 'card-future'
      });
      fireEvent.click(document.querySelector('.card-skipped'));
      expect(setActive).toHaveBeenCalledWith(1);
    });

    it('returns to origin when visited card becomes answered', () => {
      const def = {
        ...FOCUS,
        setActiveCardIndex: setActive,
        activeCardIndex: 1,
        cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
        isRequired: vi.fn().mockReturnValue(false),
        isAnswered: vi.fn().mockReturnValue(false)
      };
      mockUseQuestionFocus.mockReturnValue(def);
      const { rerender } = renderCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      });
      fireEvent.click(document.querySelector('.card-future'));
      expect(setActive).toHaveBeenCalledWith(2);
      setActive.mockClear();
      mockUseQuestionFocus.mockReturnValue({
        ...def,
        activeCardIndex: 2,
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
      const set = vi.fn();
      const base = {
        ...FOCUS,
        activeCardIndex: 1,
        setActiveCardIndex: set,
        cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
        isRequired: vi.fn().mockReturnValue(false),
        isAnswered: vi.fn().mockReturnValue(true)
      };
      mockUseQuestionFocus.mockReturnValue(base);
      const { rerender } = renderCards({
        q1: 'card-answered',
        q2: 'card-active',
        q3: 'card-future'
      });
      fireEvent.click(document.querySelector('.card-answered'));
      expect(set).toHaveBeenCalledWith(0);
      set.mockClear();
      mockUseQuestionFocus.mockReturnValue({
        ...base,
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
      expect(set).not.toHaveBeenCalled();
    });
  });

  it('does not block swipe on required unanswered card', () => {
    const setIdx = vi.fn();
    mockUseQuestionFocus.mockReturnValue({
      ...FOCUS,
      setActiveCardIndex: setIdx,
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
    expect(setIdx).toHaveBeenCalledWith(1);
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  describe('centering', () => {
    function renderCenteringCards() {
      return render(
        <CardStackContainer>
          {['q1', 'q2', 'q3'].map(id => (
            <div key={id} data-link-id={id}>
              {id}
            </div>
          ))}
        </CardStackContainer>
      );
    }

    it('scrolls active card into view center on mount', () => {
      const spy = vi.spyOn(Element.prototype, 'scrollIntoView');
      renderCenteringCards();
      expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      spy.mockRestore();
    });

    it('scrolls new card on index change', () => {
      const spy = vi.spyOn(Element.prototype, 'scrollIntoView');
      const { rerender } = renderCenteringCards();
      spy.mockClear();
      mockUseQuestionFocus.mockReturnValue({
        ...FOCUS,
        activeCardIndex: 2,
        cardStates: { q1: 'answered', q2: 'answered', q3: 'active' }
      });
      rerender(
        <CardStackContainer>
          {['q1', 'q2', 'q3'].map(id => (
            <div key={id} data-link-id={id}>
              {id}
            </div>
          ))}
        </CardStackContainer>
      );
      expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      spy.mockRestore();
    });
  });
});
