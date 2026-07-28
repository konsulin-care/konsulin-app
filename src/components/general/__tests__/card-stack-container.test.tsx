import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockF, mockSwipe, mockToast, mockStyles } = vi.hoisted(() => ({
  mockF: vi.fn<() => any>(),
  mockSwipe: vi.fn<() => any>(),
  mockToast: { error: vi.fn() } as Record<string, (...args: any[]) => any>,
  mockStyles: vi.fn().mockReturnValue(vi.fn())
}));

vi.mock('@/hooks/useQuestionFocus', () => ({ useQuestionFocus: mockF }));
vi.mock('@/hooks/useCardSwipe', () => ({ useCardSwipe: mockSwipe }));
vi.mock('../card-dom-mapper', () => ({ CardDomMapper: () => null }));
vi.mock('react-toastify', () => ({ toast: mockToast }));
vi.mock('@/lib/injectCardStyles', () => ({ injectCardStyles: mockStyles }));

import { CardStackContainer } from '../card-stack-container';

const BASE = {
  activeCardIndex: 0,
  setIdx: vi.fn(),
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
    mockF.mockReturnValue(BASE);
    mockSwipe.mockReturnValue({
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

  it('shows progress', () => {
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
  });

  it('hides Previous and Skip', () => {
    render(
      <CardStackContainer>
        <div>c</div>
      </CardStackContainer>
    );
    expect(screen.queryByText(/Previous|Skip/i)).toBeNull();
  });

  it('updates styles on state change', () => {
    render(
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
    expect(mockStyles).toHaveBeenCalledWith({
      activeLinkId: 'q2',
      answeredLinkIds: ['q1'],
      futureLinkIds: ['q3'],
      displayItemLinkIds: []
    });
  });

  it('advances on swipe up', () => {
    const s = vi.fn();
    mockF.mockReturnValue({ ...BASE, setActiveCardIndex: s });
    mockSwipe.mockReturnValue({
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
    expect(s).toHaveBeenCalledWith(1);
  });

  it('retreats on swipe down', () => {
    const s = vi.fn();
    mockF.mockReturnValue({
      ...BASE,
      activeCardIndex: 1,
      setActiveCardIndex: s,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' }
    });
    mockSwipe.mockReturnValue({
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
    expect(s).toHaveBeenCalledWith(0);
  });

  it('does not block swipe on required unanswered card', () => {
    const s = vi.fn();
    mockF.mockReturnValue({
      ...BASE,
      setActiveCardIndex: s,
      cardStates: { q1: 'answered', q2: 'future', q3: 'future' },
      isRequired: vi.fn().mockImplementation((id: string) => id === 'q2'),
      isAnswered: vi.fn().mockImplementation((id: string) => id === 'q1')
    });
    mockSwipe.mockReturnValue({
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
    expect(s).toHaveBeenCalledWith(1);
    expect(mockToast.error).not.toHaveBeenCalled();
  });
});
