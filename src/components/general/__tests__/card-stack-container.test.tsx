import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockUseQuestionFocus, mockUseCardSwipe, mockToast } = vi.hoisted(
  () => ({
    mockUseQuestionFocus: vi.fn<() => any>(),
    mockUseCardSwipe: vi.fn<() => any>(),
    mockToast: { error: vi.fn() }
  })
);

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

import { CardStackContainer } from '../card-stack-container';

describe('CardStackContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseQuestionFocus.mockReturnValue({
      activeCardIndex: 0,
      setActiveCardIndex: vi.fn(),
      totalFocusable: 3,
      totalAnswerable: 3,
      cardStates: { q1: 'active', q2: 'future', q3: 'future' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2', 'q3'],
      isRequired: vi.fn().mockReturnValue(false),
      isAnswered: vi.fn().mockReturnValue(false)
    });

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

  it('renders progress indicator with correct position', () => {
    render(
      <CardStackContainer>
        <div>content</div>
      </CardStackContainer>
    );

    expect(screen.getByText(/Question 1 of 3/i)).toBeInTheDocument();
  });

  it('shows Previous button', () => {
    mockUseQuestionFocus.mockReturnValue({
      activeCardIndex: 1,
      setActiveCardIndex: vi.fn(),
      totalFocusable: 3,
      totalAnswerable: 3,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2', 'q3'],
      isRequired: vi.fn().mockReturnValue(false),
      isAnswered: vi.fn().mockReturnValue(true)
    });

    render(
      <CardStackContainer>
        <div>content</div>
      </CardStackContainer>
    );

    expect(screen.getByText(/Previous/i)).toBeInTheDocument();
  });

  it('hides Previous button on first card', () => {
    render(
      <CardStackContainer>
        <div>content</div>
      </CardStackContainer>
    );

    expect(screen.queryByText(/Previous/i)).not.toBeInTheDocument();
  });

  it('shows Skip button when next card is not required', () => {
    // Next card (q2) is NOT required
    const mockIsRequired = vi.fn().mockReturnValue(false);

    mockUseQuestionFocus.mockReturnValue({
      activeCardIndex: 0,
      setActiveCardIndex: vi.fn(),
      totalFocusable: 3,
      totalAnswerable: 3,
      cardStates: { q1: 'active', q2: 'future', q3: 'future' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2', 'q3'],
      isRequired: mockIsRequired,
      isAnswered: vi.fn().mockReturnValue(false)
    });

    render(
      <CardStackContainer>
        <div>content</div>
      </CardStackContainer>
    );

    expect(screen.getByText(/Skip/i)).toBeInTheDocument();
  });

  it('hides Skip button when next card is required and unanswered', () => {
    // Next card (q2) is required and unanswered
    const mockIsRequired = vi
      .fn()
      .mockImplementation((linkId: string) => linkId === 'q2');

    mockUseQuestionFocus.mockReturnValue({
      activeCardIndex: 0,
      setActiveCardIndex: vi.fn(),
      totalFocusable: 3,
      totalAnswerable: 3,
      cardStates: { q1: 'active', q2: 'future', q3: 'future' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2', 'q3'],
      isRequired: mockIsRequired,
      isAnswered: vi.fn().mockReturnValue(false)
    });

    render(
      <CardStackContainer>
        <div>content</div>
      </CardStackContainer>
    );

    expect(screen.queryByText(/Skip/i)).not.toBeInTheDocument();
  });

  it('disables Skip on last card', () => {
    mockUseQuestionFocus.mockReturnValue({
      activeCardIndex: 2,
      setActiveCardIndex: vi.fn(),
      totalFocusable: 3,
      totalAnswerable: 3,
      cardStates: { q1: 'answered', q2: 'answered', q3: 'active' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2', 'q3'],
      isRequired: vi.fn().mockReturnValue(false),
      isAnswered: vi.fn().mockReturnValue(true)
    });

    render(
      <CardStackContainer>
        <div>content</div>
      </CardStackContainer>
    );

    expect(screen.queryByText(/Skip/i)).not.toBeInTheDocument();
  });

  it('calls setActiveCardIndex on swipe up', () => {
    const setActiveCardIndex = vi.fn();

    mockUseQuestionFocus.mockReturnValue({
      activeCardIndex: 0,
      setActiveCardIndex,
      totalFocusable: 3,
      totalAnswerable: 3,
      cardStates: { q1: 'active', q2: 'future', q3: 'future' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2', 'q3'],
      isRequired: vi.fn().mockReturnValue(false),
      isAnswered: vi.fn().mockReturnValue(false)
    });

    // Trigger a swipe up
    mockUseCardSwipe.mockReturnValue({
      swipeDirection: 'up',
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });

    render(
      <CardStackContainer>
        <div>content</div>
      </CardStackContainer>
    );

    // Should advance to next card
    expect(setActiveCardIndex).toHaveBeenCalledWith(1);
  });

  it('calls setActiveCardIndex on swipe down', () => {
    const setActiveCardIndex = vi.fn();

    mockUseQuestionFocus.mockReturnValue({
      activeCardIndex: 1,
      setActiveCardIndex,
      totalFocusable: 3,
      totalAnswerable: 3,
      cardStates: { q1: 'answered', q2: 'active', q3: 'future' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2', 'q3'],
      isRequired: vi.fn().mockReturnValue(false),
      isAnswered: vi.fn().mockReturnValue(true)
    });

    mockUseCardSwipe.mockReturnValue({
      swipeDirection: 'down',
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });

    render(
      <CardStackContainer>
        <div>content</div>
      </CardStackContainer>
    );

    expect(setActiveCardIndex).toHaveBeenCalledWith(0);
  });

  it('shows toast when swiping up on required unanswered card', () => {
    const setActiveCardIndex = vi.fn();
    // q2 is required; q1 is answered, q2 is not
    const mockIsRequired = vi
      .fn()
      .mockImplementation((linkId: string) => linkId === 'q2');
    const mockIsAnswered = vi
      .fn()
      .mockImplementation((linkId: string) => linkId === 'q1');

    mockUseQuestionFocus.mockReturnValue({
      activeCardIndex: 0,
      setActiveCardIndex,
      totalFocusable: 3,
      totalAnswerable: 3,
      cardStates: { q1: 'answered', q2: 'future', q3: 'future' },
      displayItemLinkIds: [],
      focusableLinkIds: ['q1', 'q2', 'q3'],
      isRequired: mockIsRequired,
      isAnswered: mockIsAnswered
    });

    mockUseCardSwipe.mockReturnValue({
      swipeDirection: 'up',
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn()
    });

    render(
      <CardStackContainer>
        <div>content</div>
      </CardStackContainer>
    );

    expect(setActiveCardIndex).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining('skip')
    );
  });
});
